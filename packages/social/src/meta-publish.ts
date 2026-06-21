/**
 * Meta Graph API organic publisher — Facebook Pages + Instagram Business.
 *
 * Required Facebook App permissions:
 *   pages_manage_posts, pages_read_engagement   (Facebook Page publishing)
 *   instagram_content_publish, instagram_basic  (Instagram publishing)
 *
 * Required env vars:
 *   META_PAGE_ID              — numeric Facebook Page ID
 *   META_PAGE_ACCESS_TOKEN    — long-lived Page access token (never a user token)
 *   META_IG_BUSINESS_ID       — Instagram Business Account ID (from Page settings)
 *
 * Rate limits to be aware of:
 *   Instagram Content Publishing: 25 posts per 24 hours per IG Business Account.
 *   Facebook Pages: no hard per-day quota but rapid posting risks reach throttling.
 *
 * API version: v21.0 (stable as of 2026; bump here and in META_API_BASE when upgrading)
 */

import { z } from 'zod';
import { logEvent, fetchWithRetry } from '@realty-engine/core';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const FacebookPostSchema = z.object({
  caption: z.string().min(1).max(63206), // FB feed character limit
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.date().optional(),
});

const InstagramPostSchema = z.object({
  caption: z.string().min(1).max(2200), // IG caption character limit
  imageUrl: z.string().url(),
  scheduledAt: z.date().optional(),
});

const InstagramReelSchema = z.object({
  caption: z.string().min(1).max(2200),
  videoUrl: z.string().url(),
  scheduledAt: z.date().optional(),
});

export type FacebookPostInput = z.infer<typeof FacebookPostSchema>;
export type InstagramPostInput = z.infer<typeof InstagramPostSchema>;
export type InstagramReelInput = z.infer<typeof InstagramReelSchema>;

export interface MetaPublishResult {
  externalId: string;
}

// ---------------------------------------------------------------------------
// Internal HTTP helper — mirrors the metaPost helper in packages/content/src/meta-ads.ts
// but uses META_PAGE_ACCESS_TOKEN instead of META_ACCESS_TOKEN (different token type).
// ---------------------------------------------------------------------------

async function metaPagePost(path: string, body: Record<string, unknown>): Promise<{ id: string }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN not set');

  const res = await fetchWithRetry(`${META_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  }, { provider: 'meta' });

  const data: { id?: string; error?: { message?: string; error_subcode?: number; code?: number } } =
    await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? JSON.stringify(data);
    const subcode = data.error?.error_subcode ?? data.error?.code ?? 'unknown';
    throw new Error(`Meta API error (subcode ${subcode}): ${msg}`);
  }

  if (!data.id) {
    throw new Error(`Meta API returned no id: ${JSON.stringify(data)}`);
  }

  return { id: data.id };
}

// ---------------------------------------------------------------------------
// Facebook Page publisher
// ---------------------------------------------------------------------------

/**
 * Publish an organic post to a Facebook Page.
 *
 * Required permissions: pages_manage_posts, pages_read_engagement
 *
 * - Text-only post: caption only, no mediaUrls
 * - Link post:      caption + one URL in mediaUrls[0] (uses /feed endpoint)
 * - Photo post:     caption + one image URL in mediaUrls[0] (uses /photos endpoint)
 * - Multi-photo:    caption + multiple URLs — posts first image; FB Graph API does
 *                   not support multi-photo in a single call without batch upload.
 *                   TODO: implement batch photo upload via /{page-id}/photos?published=false
 *                   for true carousel posts.
 * - Scheduled:      scheduledAt must be at least 10 minutes and at most 30 days in the future.
 */
export async function publishToFacebookPage(
  post: FacebookPostInput
): Promise<MetaPublishResult> {
  const parsed = FacebookPostSchema.safeParse(post);
  if (!parsed.success) {
    throw new Error(`Invalid Facebook post input: ${parsed.error.message}`);
  }

  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new Error('META_PAGE_ID not set');

  const { caption, mediaUrls, scheduledAt } = parsed.data;
  const hasImage = (mediaUrls?.length ?? 0) > 0;

  try {
    let externalId: string;

    if (hasImage) {
      // Photo post — uses /photos endpoint which accepts a URL directly.
      // Only the first URL is used; multi-photo carousels require a separate upload flow.
      const body: Record<string, unknown> = {
        url: mediaUrls![0],
        caption,
      };

      if (scheduledAt) {
        body.scheduled_publish_time = Math.floor(scheduledAt.getTime() / 1000);
        body.published = false;
      }

      const result = await metaPagePost(`/${pageId}/photos`, body);
      externalId = result.id;
    } else {
      // Text or link post — uses /feed endpoint.
      const body: Record<string, unknown> = { message: caption };

      if (scheduledAt) {
        body.scheduled_publish_time = Math.floor(scheduledAt.getTime() / 1000);
        body.published = false;
      }

      const result = await metaPagePost(`/${pageId}/feed`, body);
      externalId = result.id;
    }

    await logEvent('meta_fb_publish_success', {
      pageId,
      externalId,
      hasImage,
      scheduled: !!scheduledAt,
    });

    return { externalId };
  } catch (err) {
    await logEvent('meta_fb_publish_error', {
      pageId,
      error: err instanceof Error ? err.message : String(err),
      hasImage,
      scheduled: !!scheduledAt,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Instagram image publisher (two-step: create container → publish)
// ---------------------------------------------------------------------------

/**
 * Publish a photo post to an Instagram Business Account.
 *
 * Required permissions: instagram_content_publish, instagram_basic
 *
 * Rate limit: 25 posts per 24 hours per IG Business Account (enforced by Meta).
 *
 * The imageUrl MUST be a publicly accessible URL. Supabase Storage public bucket
 * URLs work perfectly here. Private/signed URLs will fail at step 1.
 *
 * Two-step process:
 *   Step 1 — POST /{ig-user-id}/media        → returns creation_id (media container)
 *   Step 2 — POST /{ig-user-id}/media_publish → returns the published media id
 *
 * Note: Instagram Graph API does not support truly scheduled organic posts via
 * the Content Publishing API as of v21.0. scheduledAt is accepted here for
 * interface consistency but the post is published immediately. Scheduling
 * requires Creator Studio / Meta Business Suite and is not available via API.
 * TODO: revisit if Meta adds scheduling to the Content Publishing API.
 */
export async function publishToInstagram(
  post: InstagramPostInput
): Promise<MetaPublishResult> {
  const parsed = InstagramPostSchema.safeParse(post);
  if (!parsed.success) {
    throw new Error(`Invalid Instagram post input: ${parsed.error.message}`);
  }

  const igUserId = process.env.META_IG_BUSINESS_ID;
  if (!igUserId) throw new Error('META_IG_BUSINESS_ID not set');

  const { caption, imageUrl } = parsed.data;

  try {
    // Step 1: Create media container
    const container = await metaPagePost(`/${igUserId}/media`, {
      image_url: imageUrl,
      caption,
    });

    const creationId = container.id;

    // Step 2: Publish the container
    const published = await metaPagePost(`/${igUserId}/media_publish`, {
      creation_id: creationId,
    });

    await logEvent('meta_ig_publish_success', {
      igUserId,
      creationId,
      externalId: published.id,
    });

    return { externalId: published.id };
  } catch (err) {
    await logEvent('meta_ig_publish_error', {
      igUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Instagram Reels publisher (two-step: create container → publish)
// ---------------------------------------------------------------------------

/**
 * Publish a Reel to an Instagram Business Account.
 *
 * Required permissions: instagram_content_publish, instagram_basic
 *
 * Rate limit: counts toward the same 25 posts/24hr quota as photo posts.
 *
 * The videoUrl MUST be a publicly accessible URL. Meta fetches the video
 * server-side during container creation; private/signed URLs will fail.
 *
 * Reel requirements (Meta enforced):
 *   - Format: MP4 or MOV, H.264 codec
 *   - Duration: 3 seconds – 90 seconds
 *   - Aspect ratio: 9:16 recommended (1080×1920px)
 *   - Max file size: 1 GB
 *
 * Note: Same scheduling limitation as photo posts — IG Content Publishing API
 * does not support scheduled Reels via API as of v21.0.
 */
export async function publishToInstagramReel(
  post: InstagramReelInput
): Promise<MetaPublishResult> {
  const parsed = InstagramReelSchema.safeParse(post);
  if (!parsed.success) {
    throw new Error(`Invalid Instagram Reel input: ${parsed.error.message}`);
  }

  const igUserId = process.env.META_IG_BUSINESS_ID;
  if (!igUserId) throw new Error('META_IG_BUSINESS_ID not set');

  const { caption, videoUrl } = parsed.data;

  try {
    // Step 1: Create Reel media container
    const container = await metaPagePost(`/${igUserId}/media`, {
      media_type: 'REELS',
      video_url: videoUrl,
      caption,
    });

    const creationId = container.id;

    // Step 2: Poll until Meta finishes processing the video (status_code = FINISHED).
    // Meta typically takes 5-30 seconds; we poll up to 10 times with exponential backoff.
    const token = process.env.META_PAGE_ACCESS_TOKEN!;
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const statusRes = await fetch(
        `${META_API_BASE}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`
      );
      const statusData: { status_code?: string; error?: { message?: string } } = await statusRes.json();
      if (statusData.error) throw new Error(`Meta status poll error: ${statusData.error.message}`);
      if (statusData.status_code === 'FINISHED') break;
      if (statusData.status_code === 'ERROR') throw new Error('Meta video processing failed (status: ERROR)');
      attempts++;
      if (attempts >= maxAttempts) throw new Error(`Meta video processing timed out after ${maxAttempts} attempts`);
      await new Promise((r) => setTimeout(r, Math.min(3000 * Math.pow(1.5, attempts - 1), 30_000)));
    }

    // Step 3: Publish the Reel container
    const published = await metaPagePost(`/${igUserId}/media_publish`, {
      creation_id: creationId,
    });

    await logEvent('meta_ig_reel_publish_success', {
      igUserId,
      creationId,
      externalId: published.id,
    });

    return { externalId: published.id };
  } catch (err) {
    await logEvent('meta_ig_reel_publish_error', {
      igUserId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
