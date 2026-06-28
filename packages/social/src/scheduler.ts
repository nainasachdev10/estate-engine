import { logEvent, fetchWithRetry } from '@realty-engine/core';
import {
  publishToFacebookPage,
  publishToInstagram,
  publishToInstagramReel,
} from './meta-publish';

export interface SocialPost {
  platform: string;
  caption: string;
  mediaUrls?: string[];
  scheduledAt: Date;
}

export interface ScheduleResult {
  externalId: string;
  provider: 'postiz' | 'ayrshare' | 'mock' | 'meta';
}

/**
 * Provider-agnostic social scheduler.
 *
 * Reads SOCIAL_PROVIDER env var:
 *   - postiz   → calls Postiz API (POSTIZ_API_KEY, POSTIZ_API_URL)
 *   - ayrshare → calls Ayrshare API (AYRSHARE_API_KEY)
 *   - unset / mock → logs and returns a mock externalId
 *
 * See docs/postiz-setup.md for configuration details.
 */
export async function schedulePost(post: SocialPost): Promise<ScheduleResult> {
  const provider = (process.env.SOCIAL_PROVIDER ?? 'mock').toLowerCase();

  try {
    if (provider === 'postiz') {
      return await schedulePostiz(post);
    }

    if (provider === 'ayrshare') {
      return await scheduleAyrshare(post);
    }

    if (provider === 'meta') {
      return await scheduleMeta(post);
    }

    // Mock provider — for local dev before any social key is wired up.
    await logEvent('social_schedule_mock', {
      platform: post.platform,
      scheduledAt: post.scheduledAt.toISOString(),
      captionLength: post.caption.length,
    });

    return { externalId: `mock-${Date.now()}`, provider: 'mock' };
  } catch (err) {
    await logEvent('social_schedule_error', {
      provider,
      error: err instanceof Error ? err.message : String(err),
      platform: post.platform,
    });
    throw err;
  }
}

async function schedulePostiz(post: SocialPost): Promise<ScheduleResult> {
  const apiKey = process.env.POSTIZ_API_KEY;
  const apiUrl = process.env.POSTIZ_API_URL ?? 'https://api.postiz.com/v1/posts';

  if (!apiKey) {
    throw new Error('Missing POSTIZ_API_KEY for SOCIAL_PROVIDER=postiz');
  }

  const res = await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      platforms: [post.platform],
      content: post.caption,
      media: post.mediaUrls ?? [],
      scheduledAt: post.scheduledAt.toISOString(),
    }),
  }, { provider: 'postiz' });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz error ${res.status}: ${text}`);
  }

  const data: { id?: string; postId?: string } = await res.json();
  return { externalId: data.id ?? data.postId ?? `postiz-${Date.now()}`, provider: 'postiz' };
}

async function scheduleAyrshare(post: SocialPost): Promise<ScheduleResult> {
  const apiKey = process.env.AYRSHARE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AYRSHARE_API_KEY for SOCIAL_PROVIDER=ayrshare');
  }

  const res = await fetchWithRetry('https://app.ayrshare.com/api/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      post: post.caption,
      platforms: [post.platform],
      mediaUrls: post.mediaUrls ?? [],
      scheduleDate: post.scheduledAt.toISOString(),
    }),
  }, { provider: 'ayrshare' });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ayrshare error ${res.status}: ${text}`);
  }

  const data: { id?: string } = await res.json();
  return { externalId: data.id ?? `ayrshare-${Date.now()}`, provider: 'ayrshare' };
}

/**
 * Routes a SocialPost to the appropriate Meta Graph API publisher.
 *
 * Supported post.platform values:
 *   'facebook'        → publishToFacebookPage  (text, link, or photo)
 *   'instagram'       → publishToInstagram     (single image, public URL required)
 *   'instagram_reel'  → publishToInstagramReel (video, public URL required)
 *
 * Required env vars: META_PAGE_ID, META_PAGE_ACCESS_TOKEN, META_IG_BUSINESS_ID
 * Set SOCIAL_PROVIDER=meta to activate this path.
 */
async function scheduleMeta(post: SocialPost): Promise<ScheduleResult> {
  const platform = post.platform.toLowerCase();

  if (platform === 'facebook') {
    const result = await publishToFacebookPage({
      caption: post.caption,
      mediaUrls: post.mediaUrls,
      scheduledAt: post.scheduledAt,
    });
    return { externalId: result.externalId, provider: 'meta' };
  }

  if (platform === 'instagram') {
    // Instagram requires exactly one image URL — use the first mediaUrl if present,
    // otherwise treat caption-only posts as unsupported (IG requires media).
    const imageUrl = post.mediaUrls?.[0];
    if (!imageUrl) {
      throw new Error(
        'Instagram posts via Meta provider require at least one image URL in mediaUrls'
      );
    }
    const result = await publishToInstagram({
      caption: post.caption,
      imageUrl,
      scheduledAt: post.scheduledAt,
    });
    return { externalId: result.externalId, provider: 'meta' };
  }

  if (platform === 'instagram_reel') {
    const videoUrl = post.mediaUrls?.[0];
    if (!videoUrl) {
      throw new Error(
        'Instagram Reels via Meta provider require a video URL in mediaUrls[0]'
      );
    }
    const result = await publishToInstagramReel({
      caption: post.caption,
      videoUrl,
      scheduledAt: post.scheduledAt,
    });
    return { externalId: result.externalId, provider: 'meta' };
  }

  throw new Error(
    `Unsupported platform "${post.platform}" for Meta provider. ` +
    `Use 'facebook', 'instagram', or 'instagram_reel'.`
  );
}
