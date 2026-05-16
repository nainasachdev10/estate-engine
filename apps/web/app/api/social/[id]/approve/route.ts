import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { schedulePost } from '@realty-engine/social';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    const { data: post, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.status === 'scheduled' || post.status === 'posted') {
      return NextResponse.json({ ok: true, alreadyScheduled: true });
    }

    const result = await schedulePost({
      platform: post.platform,
      caption: post.caption ?? '',
      mediaUrls: post.media_urls ?? [],
      scheduledAt: post.scheduled_at ? new Date(post.scheduled_at) : new Date(),
    });

    const { error: updateErr } = await supabase
      .from('social_posts')
      .update({
        status: 'scheduled',
        external_post_id: result.externalId,
      })
      .eq('id', params.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logEvent('social_post_approved', {
      id: params.id,
      provider: result.provider,
      externalId: result.externalId,
    });

    return NextResponse.json({ ok: true, externalId: result.externalId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('social_approve_error', { id: params.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
