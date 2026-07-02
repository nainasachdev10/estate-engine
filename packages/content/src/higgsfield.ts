// Higgsfield AI — image + video generation client
// Docs: https://docs.higgsfield.ai
// Auth: Authorization: Key {key_id}:{key_secret}  (both halves required — a bare key alone 500s)
// Generation is async — submit returns a jobset, then poll until every job completes.
//
// Request shape below is verified against the live API (POST /v1/text2image/soul):
// body must be { params: { prompt, width_and_height, quality, batch_size } } with the
// exact enum values the API reports on a 422. The completed-job response shape is not
// live-verified (blocked on account credits) — parseJobResult() is intentionally
// tolerant of the couple of shapes documented across Higgsfield's SDKs.

import { z } from 'zod';
import { logEvent, fetchWithRetry } from '@realty-engine/core';

const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';
const POLL_INTERVAL_MS = 3_000;

// Confirmed live via 422 validation error from POST /v1/text2image/soul
const SOUL_SIZES = [
  '1152x2048', '2048x1152', '2048x1536', '1536x2048', '1344x2016', '2016x1344',
  '960x1696', '1536x1536', '1536x1152', '1696x960', '1152x1536', '1088x1632',
  '1632x1088', '1120x1680', '1680x1120', '2048x2048',
] as const;

// ---------------------------------------------------------------------------
// Zod input schemas (exported for route-level validation)
// ---------------------------------------------------------------------------

export const GenerateImageInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  width_and_height: z.enum(SOUL_SIZES).default('1536x1536'),
  quality: z.enum(['720p', '1080p']).default('1080p'),
  batch_size: z.union([z.literal(1), z.literal(4)]).default(1),
  reference_image_url: z.string().url().optional(),
});

export type GenerateImageInput = z.input<typeof GenerateImageInputSchema>;

// Convenience mapper from the app's aspect-ratio vocabulary to a valid Soul size.
export function aspectRatioToSoulSize(ratio: '1:1' | '9:16' | '16:9' | '4:5'): (typeof SOUL_SIZES)[number] {
  switch (ratio) {
    case '1:1': return '1536x1536';
    case '9:16': return '1152x2048';
    case '16:9': return '2048x1152';
    case '4:5': return '1536x2048';
  }
}

export const GenerateVideoInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  image_url: z.string().url(), // DoP is image-to-video — a source image is required
  model: z.enum(['turbo', 'standard']).default('turbo'),
});

export type GenerateVideoInput = z.input<typeof GenerateVideoInputSchema>;

// ---------------------------------------------------------------------------
// Zod response schemas
// ---------------------------------------------------------------------------

// Submission returns a "jobset": { id, type, created_at, jobs: [{ id, status, ... }] }
const JobSetSchema = z.object({
  id: z.string(),
  jobs: z.array(z.object({ id: z.string() })).min(1),
});

const JOB_STATUS = ['queued', 'in_progress', 'completed', 'failed', 'nsfw', 'canceled'] as const;

// Completed-job shape is not live-verified — accept the couple of documented variants.
const JobStatusSchema = z.object({
  id: z.string(),
  status: z.enum(JOB_STATUS),
  results: z
    .object({
      raw: z.object({ url: z.string().url() }).optional(),
      min: z.object({ url: z.string().url() }).optional(),
      url: z.string().url().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

type JobStatus = z.infer<typeof JobStatusSchema>;

function extractResultUrl(job: JobStatus): string | undefined {
  return job.results?.raw?.url ?? job.results?.url ?? job.results?.min?.url;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function getAuthHeader(): string {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error('HIGGSFIELD_API_KEY is not set');
  if (!key.includes(':')) {
    throw new Error(
      'HIGGSFIELD_API_KEY must be "KEY_ID:KEY_SECRET" — a bare key alone is rejected by the API.'
    );
  }
  return `Key ${key}`;
}

async function higgsfieldPost(path: string, params: Record<string, unknown>): Promise<unknown> {
  const url = `${HIGGSFIELD_BASE}${path}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({ params }),
  }, { provider: 'higgsfield' });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Higgsfield POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${HIGGSFIELD_BASE}/v1/jobs/${jobId}`, {
    headers: { Authorization: getAuthHeader(), Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Higgsfield job status poll failed (${res.status}) for job ${jobId}`);
  }
  return JobStatusSchema.parse(await res.json());
}

async function pollJob(jobId: string, maxMs: number): Promise<JobStatus> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const job = await fetchJobStatus(jobId);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'nsfw' || job.status === 'canceled') {
      return job;
    }
    // queued | in_progress — keep polling
  }
  throw new Error(`Higgsfield generation timed out after ${maxMs / 1000}s (job_id: ${jobId})`);
}

// ---------------------------------------------------------------------------
// generateImage
// ---------------------------------------------------------------------------

export async function generateImage(
  input: GenerateImageInput
): Promise<{ url: string; generation_id: string }> {
  const validated = GenerateImageInputSchema.parse(input);

  await logEvent('higgsfield_call', {
    type: 'image',
    width_and_height: validated.width_and_height,
    quality: validated.quality,
    prompt: validated.prompt.slice(0, 200),
  });

  let jobId: string;

  try {
    const params: Record<string, unknown> = {
      prompt: validated.prompt,
      width_and_height: validated.width_and_height,
      quality: validated.quality,
      batch_size: validated.batch_size,
    };
    if (validated.reference_image_url) {
      params.reference_image_url = validated.reference_image_url;
    }

    const raw = await higgsfieldPost('/v1/text2image/soul', params);
    const jobset = JobSetSchema.parse(raw);
    jobId = jobset.jobs[0].id;
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'image',
      stage: 'submit',
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  try {
    // Max 90s for images
    const job = await pollJob(jobId, 90_000);
    const url = extractResultUrl(job);

    if (job.status !== 'completed' || !url) {
      throw new Error(`Higgsfield image generation did not complete: ${job.error ?? job.status}`);
    }

    await logEvent('higgsfield_call', { type: 'image', stage: 'completed', generation_id: jobId });

    return { url, generation_id: jobId };
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'image',
      stage: 'poll',
      generation_id: jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// generateVideo
// ---------------------------------------------------------------------------

export async function generateVideo(
  input: GenerateVideoInput
): Promise<{ url: string; generation_id: string }> {
  const validated = GenerateVideoInputSchema.parse(input);

  await logEvent('higgsfield_call', {
    type: 'video',
    model: validated.model,
    prompt: validated.prompt.slice(0, 200),
  });

  let jobId: string;

  try {
    const params: Record<string, unknown> = {
      model: validated.model,
      prompt: validated.prompt,
      input_images: [{ type: 'url', url: validated.image_url }],
    };

    const raw = await higgsfieldPost('/v1/image2video/dop', params);
    const jobset = JobSetSchema.parse(raw);
    jobId = jobset.jobs[0].id;
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'video',
      stage: 'submit',
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  try {
    // Max 300s for video
    const job = await pollJob(jobId, 300_000);
    const url = extractResultUrl(job);

    if (job.status !== 'completed' || !url) {
      throw new Error(`Higgsfield video generation did not complete: ${job.error ?? job.status}`);
    }

    await logEvent('higgsfield_call', { type: 'video', stage: 'completed', generation_id: jobId });

    return { url, generation_id: jobId };
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'video',
      stage: 'poll',
      generation_id: jobId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
