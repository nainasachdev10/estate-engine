import { logEvent } from '@realty-engine/core';

export interface SocialPost {
  platform: string;
  caption: string;
  mediaUrls?: string[];
  scheduledAt: Date;
}

export interface ScheduleResult {
  externalId: string;
  provider: 'postiz' | 'ayrshare' | 'mock';
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

    // Mock provider — for local dev before any social key is wired up.
    console.log(
      '[social] mock schedule:',
      post.platform,
      post.scheduledAt.toISOString(),
      `(${post.caption.slice(0, 40)}...)`
    );

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

  const res = await fetch(apiUrl, {
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
  });

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

  const res = await fetch('https://app.ayrshare.com/api/post', {
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
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ayrshare error ${res.status}: ${text}`);
  }

  const data: { id?: string } = await res.json();
  return { externalId: data.id ?? `ayrshare-${Date.now()}`, provider: 'ayrshare' };
}
