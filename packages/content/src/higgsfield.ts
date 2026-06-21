// Higgsfield AI — image + video generation client
// Docs: https://docs.higgsfield.ai
// Auth: Authorization: Key {api_key}:{api_key_secret}
// Generation is async — submit returns request_id, then poll status_url until complete.

import { z } from 'zod';
import { logEvent, fetchWithRetry } from '@realty-engine/core';

const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';
const POLL_INTERVAL_MS = 3_000;

// ---------------------------------------------------------------------------
// Zod input schemas (exported for route-level validation)
// ---------------------------------------------------------------------------

export const GenerateImageInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  aspect_ratio: z.enum(['1:1', '9:16', '16:9', '4:5']).default('1:1'),
  model: z.enum(['higgsfield-ai/soul/standard', 'reve/text-to-image']).default('higgsfield-ai/soul/standard'),
  reference_image_url: z.string().url().optional(),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const GenerateVideoInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  image_url: z.string().url().optional(),
  duration_seconds: z.union([z.literal(5), z.literal(10)]).default(10),
  model: z.enum([
    'higgsfield-ai/dop/standard',
    'kling-video/v2.1/pro/image-to-video',
    'bytedance/seedance/v1/pro/image-to-video',
  ]).default('kling-video/v2.1/pro/image-to-video'),
  aspect_ratio: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
});

export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

// ---------------------------------------------------------------------------
// Zod response schemas
// ---------------------------------------------------------------------------

const SubmitResponseSchema = z.object({
  request_id: z.string(),
  status: z.string(),
  status_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

const StatusResponseSchema = z.object({
  request_id: z.string(),
  status: z.enum(['queued', 'in_progress', 'completed', 'failed', 'nsfw']),
  images: z.array(z.object({ url: z.string().url() })).optional(),
  video: z.object({ url: z.string().url() }).optional(),
  error: z.string().optional(),
});

type StatusResponse = z.infer<typeof StatusResponseSchema>;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function getAuthHeader(): string {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error('HIGGSFIELD_API_KEY is not set');
  // Key may be provided as "key:secret" already or as a plain key
  return `Key ${key}`;
}

async function higgsfieldPost(modelPath: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `${HIGGSFIELD_BASE}/${modelPath}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  }, { provider: 'higgsfield' });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Higgsfield POST ${modelPath} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function pollStatus(requestId: string, statusUrl: string, maxMs: number): Promise<StatusResponse> {
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(statusUrl, {
      headers: { Authorization: getAuthHeader(), Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Higgsfield status poll failed (${res.status}) for request ${requestId}`);
    }

    const raw = await res.json();
    const parsed = StatusResponseSchema.parse(raw);

    if (parsed.status === 'completed' || parsed.status === 'failed' || parsed.status === 'nsfw') {
      return parsed;
    }
    // queued | in_progress — keep polling
  }

  throw new Error(`Higgsfield generation timed out after ${maxMs / 1000}s (request_id: ${requestId})`);
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
    model: validated.model,
    aspect_ratio: validated.aspect_ratio,
    prompt: validated.prompt.slice(0, 200),
  });

  let requestId: string;
  let statusUrl: string;

  try {
    const body: Record<string, unknown> = {
      prompt: validated.prompt,
      aspect_ratio: validated.aspect_ratio,
    };
    if (validated.reference_image_url) {
      body.image_url = validated.reference_image_url;
    }

    const raw = await higgsfieldPost(validated.model, body);
    const submit = SubmitResponseSchema.parse(raw);
    requestId = submit.request_id;
    statusUrl = submit.status_url ?? `${HIGGSFIELD_BASE}/requests/${requestId}/status`;
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
    const result = await pollStatus(requestId, statusUrl, 90_000);

    if (result.status !== 'completed' || !result.images?.[0]?.url) {
      const reason = result.error ?? result.status;
      throw new Error(`Higgsfield image generation did not complete: ${reason}`);
    }

    await logEvent('higgsfield_call', {
      type: 'image',
      stage: 'completed',
      generation_id: requestId,
    });

    return { url: result.images[0].url, generation_id: requestId };
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'image',
      stage: 'poll',
      generation_id: requestId,
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
    aspect_ratio: validated.aspect_ratio,
    duration_seconds: validated.duration_seconds,
    has_image: !!validated.image_url,
    prompt: validated.prompt.slice(0, 200),
  });

  let requestId: string;
  let statusUrl: string;

  try {
    const body: Record<string, unknown> = {
      prompt: validated.prompt,
      duration: validated.duration_seconds,
      aspect_ratio: validated.aspect_ratio,
    };
    if (validated.image_url) {
      body.image_url = validated.image_url;
    }

    const raw = await higgsfieldPost(validated.model, body);
    const submit = SubmitResponseSchema.parse(raw);
    requestId = submit.request_id;
    statusUrl = submit.status_url ?? `${HIGGSFIELD_BASE}/requests/${requestId}/status`;
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
    const result = await pollStatus(requestId, statusUrl, 300_000);

    if (result.status !== 'completed' || !result.video?.url) {
      const reason = result.error ?? result.status;
      throw new Error(`Higgsfield video generation did not complete: ${reason}`);
    }

    await logEvent('higgsfield_call', {
      type: 'video',
      stage: 'completed',
      generation_id: requestId,
    });

    return { url: result.video.url, generation_id: requestId };
  } catch (err) {
    await logEvent('higgsfield_error', {
      type: 'video',
      stage: 'poll',
      generation_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
