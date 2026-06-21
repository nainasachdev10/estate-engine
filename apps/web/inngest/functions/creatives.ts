// ─── Function D: project.activated → generate full creative suite ────────────
//
// Triggered when an operator activates a project. Fans out:
//   1. Generate ad copy variants (10 of them) → inserts into campaigns table
//   2. Generate social posts (30 days) → inserts into social_posts
//   3. Fan out image generation per campaign (concurrency-limited)
//   4. Fan out video generation per campaign (concurrency-limited)
//
// Concurrency at the function level keeps us under Higgsfield's rate limit.
// Per-asset generation is delegated to child functions invoked via events so
// each one retries independently if Higgsfield is slow or transient-fails.

import { inngest } from '../../inngest-client';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import {
  generateAdCreatives,
  generateSocialMonth,
  generateImage,
  generateVideo,
} from '@realty-engine/content';

interface ProjectActivatedEvent {
  data: { projectId: string };
}

interface CampaignAssetEvent {
  data: { campaignId: string; projectId: string };
}

// Helper: pull project + client context we need for content generation
async function fetchProjectContext(projectId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, location, segment, unit_type, price_min_paise, price_max_paise, usp_bullets, key_amenities, developer_about, rera_number, clients(name, brand_name, brand_voice_notes)')
    .eq('id', projectId)
    .single();

  if (error || !data) throw new Error(`Project ${projectId} not found for activation`);

  const client = Array.isArray(data.clients) ? data.clients[0] : (data.clients as any);
  return { project: data, client };
}

// ─── creativesOnProjectActivated (the orchestrator) ──────────────────────────

export const creativesOnProjectActivated = inngest.createFunction(
  {
    id: 'creatives-on-project-activated',
    name: 'Creatives on Project Activated',
    // Respect Higgsfield rate limits — at most 3 active project activations at once
    concurrency: { limit: 3 },
  },
  { event: 'project/activated' },
  async ({ event, step }: { event: ProjectActivatedEvent; step: any }) => {
    const { projectId } = event.data;

    // Step 1: generate ad copy and persist as campaign rows
    const campaignIds = await step.run('generate-ad-copy', async () => {
      const { project, client } = await fetchProjectContext(projectId);
      const variants = await generateAdCreatives(project as any, client as any);

      const supabase = getSupabaseServer();
      const rows = variants.map((v: any) => ({
        project_id: projectId,
        platform: v.type.startsWith('meta') ? 'meta' : (v.type.startsWith('google') ? 'google' : '99acres'),
        name: `${(project as any).name} — ${v.type}`,
        status: 'draft',
        headline: v.headline ?? v.title ?? v.headlines?.[0] ?? null,
        primary_text: v.primary_text ?? v.description ?? v.voiceover ?? v.descriptions?.[0] ?? null,
      }));

      const { data: inserted, error } = await supabase
        .from('campaigns')
        .insert(rows)
        .select('id');

      if (error) throw new Error(`Failed to insert campaigns: ${error.message}`);
      await logEvent('creatives_ad_copy_generated', { projectId, count: inserted?.length ?? 0 });
      return (inserted ?? []).map((r: { id: string }) => r.id);
    });

    // Step 2: generate social month plan (30 days)
    await step.run('generate-social-posts', async () => {
      const { project, client } = await fetchProjectContext(projectId);
      const posts = await generateSocialMonth(project as any, client as any, 30);

      const supabase = getSupabaseServer();
      const rows = posts.map((p: any) => ({
        project_id: projectId,
        platform: p.platform,
        post_type: p.post_type,
        caption: p.caption,
        hashtags: p.hashtags ?? [],
        media_brief: p.media_brief,
        suggested_post_at: p.suggested_post_at,
        theme: p.theme,
        status: 'draft',
      }));

      const { error } = await supabase.from('social_posts').insert(rows);
      if (error) {
        // Don't kill the whole orchestration on social insert failure — log + continue.
        await logEvent('creatives_social_insert_failed', { projectId, error: error.message });
      } else {
        await logEvent('creatives_social_generated', { projectId, count: rows.length });
      }
    });

    // Step 3: fan out image generation. We send events rather than step.invoke so
    // each image gen is its own function run with independent retry policy.
    await step.run('fanout-images', async () => {
      const events = campaignIds.map((campaignId: string) => ({
        name: 'campaign/generate-image',
        data: { campaignId, projectId },
      }));
      if (events.length > 0) {
        await inngest.send(events);
      }
      await logEvent('creatives_images_fanout', { projectId, count: events.length });
    });

    // Step 4: fan out video generation (same pattern)
    await step.run('fanout-videos', async () => {
      const events = campaignIds.map((campaignId: string) => ({
        name: 'campaign/generate-video',
        data: { campaignId, projectId },
      }));
      if (events.length > 0) {
        await inngest.send(events);
      }
      await logEvent('creatives_videos_fanout', { projectId, count: events.length });
    });

    return { status: 'creatives_pipeline_started', projectId, campaignCount: campaignIds.length };
  },
);

// ─── Per-campaign image generation (child function) ──────────────────────────

export const generateImageForCampaign = inngest.createFunction(
  {
    id: 'generate-image-for-campaign',
    name: 'Generate Image for Campaign',
    // Higgsfield image rate limit: keep simultaneous gens modest
    concurrency: { limit: 3 },
    retries: 2,
  },
  { event: 'campaign/generate-image' },
  async ({ event, step }: { event: CampaignAssetEvent; step: any }) => {
    const { campaignId, projectId } = event.data;

    // Step 1: read prompt context from campaign row + project
    const prompt = await step.run('build-prompt', async () => {
      const supabase = getSupabaseServer();
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('headline, primary_text, projects(name, location, segment)')
        .eq('id', campaignId)
        .single();

      const project: any = Array.isArray((campaign as any)?.projects)
        ? (campaign as any).projects[0]
        : (campaign as any)?.projects;
      const headline = (campaign as any)?.headline ?? '';
      const primary = (campaign as any)?.primary_text ?? '';

      return [
        `Premium Indian real estate ad creative for ${project?.name ?? 'a project'} in ${project?.location ?? 'India'}.`,
        `Segment: ${project?.segment ?? 'premium'}. Headline: ${headline}. Body: ${primary}.`,
        `Style: cinematic, golden-hour lighting, architectural, aspirational.`,
      ].join(' ').slice(0, 1800);
    });

    // Step 2: insert a pending row so the UI can show a placeholder + generate
    const pendingRowId = await step.run('insert-pending-media', async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('ad_creative_media')
        .insert([{ creative_id: campaignId, type: 'image', url: '', status: 'pending' }])
        .select('id')
        .single();
      if (error) throw new Error(`Failed to insert pending media row: ${error.message}`);
      return data.id as string;
    });

    // Step 3: actually call Higgsfield (longest network step — kept isolated)
    try {
      const result = await step.run('higgsfield-generate', async () => {
        // Cast: zod schema defaults make `model` optional at runtime via parse(),
        // but z.infer still types it as required. Defaults fill in inside generateImage.
        return generateImage({ prompt, aspect_ratio: '1:1' } as any);
      });

      await step.run('mark-ready', async () => {
        const supabase = getSupabaseServer();
        await supabase
          .from('ad_creative_media')
          .update({ url: result.url, generation_id: result.generation_id, status: 'ready' })
          .eq('id', pendingRowId);
        await supabase
          .from('campaigns')
          .update({ creative_url: result.url, image_asset_id: result.generation_id })
          .eq('id', campaignId);
        await logEvent('campaign_image_ready', { campaignId }, { projectId });
      });
    } catch (err) {
      await step.run('mark-failed', async () => {
        const supabase = getSupabaseServer();
        await supabase
          .from('ad_creative_media')
          .update({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500) })
          .eq('id', pendingRowId);
      });
      throw err;
    }

    return { status: 'image_ready', campaignId };
  },
);

// ─── Per-campaign video generation (child function) ──────────────────────────

export const generateVideoForCampaign = inngest.createFunction(
  {
    id: 'generate-video-for-campaign',
    name: 'Generate Video for Campaign',
    concurrency: { limit: 2 },
    retries: 2,
  },
  { event: 'campaign/generate-video' },
  async ({ event, step }: { event: CampaignAssetEvent; step: any }) => {
    const { campaignId, projectId } = event.data;

    const prompt = await step.run('build-prompt', async () => {
      const supabase = getSupabaseServer();
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('headline, primary_text, creative_url, projects(name, location, segment)')
        .eq('id', campaignId)
        .single();

      const project: any = Array.isArray((campaign as any)?.projects)
        ? (campaign as any).projects[0]
        : (campaign as any)?.projects;

      return {
        prompt: [
          `Cinematic 10-second real estate ad for ${project?.name ?? 'project'} in ${project?.location ?? 'India'}.`,
          `${(campaign as any)?.primary_text ?? ''}`,
          `Slow drone pan, warm sunset, luxury Indian architecture.`,
        ].join(' ').slice(0, 1800),
        seedImage: ((campaign as any)?.creative_url ?? null) as string | null,
      };
    });

    const pendingRowId = await step.run('insert-pending-media', async () => {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('ad_creative_media')
        .insert([{ creative_id: campaignId, type: 'video', url: '', status: 'pending' }])
        .select('id')
        .single();
      if (error) throw new Error(`Failed to insert pending media row: ${error.message}`);
      return data.id as string;
    });

    try {
      const result = await step.run('higgsfield-generate', async () => {
        return generateVideo({
          prompt: prompt.prompt,
          image_url: prompt.seedImage ?? undefined,
          duration_seconds: 10,
          aspect_ratio: '9:16',
        } as any);
      });

      await step.run('mark-ready', async () => {
        const supabase = getSupabaseServer();
        await supabase
          .from('ad_creative_media')
          .update({ url: result.url, generation_id: result.generation_id, status: 'ready' })
          .eq('id', pendingRowId);
        await supabase
          .from('campaigns')
          .update({ video_asset_id: result.generation_id })
          .eq('id', campaignId);
        await logEvent('campaign_video_ready', { campaignId }, { projectId });
      });
    } catch (err) {
      await step.run('mark-failed', async () => {
        const supabase = getSupabaseServer();
        await supabase
          .from('ad_creative_media')
          .update({ status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500) })
          .eq('id', pendingRowId);
      });
      throw err;
    }

    return { status: 'video_ready', campaignId };
  },
);
