import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = getSupabaseServer();

    // Preferred persisted status is 'skipped'. Databases whose CHECK constraint
    // predates migration 0013 only allow draft/scheduled/posted/failed, so if the
    // 'skipped' write is rejected we fall back to 'failed' rather than silently
    // succeeding without persisting anything.
    let { error } = await supabase
      .from('social_posts')
      .update({ status: 'skipped' })
      .eq('id', params.id);

    if (error) {
      const retry = await supabase
        .from('social_posts')
        .update({ status: 'failed' })
        .eq('id', params.id);
      error = retry.error;
    }

    if (error) {
      await logEvent('social_skip_error', { id: params.id, error: error.message });
      return NextResponse.json({ error: 'Failed to skip post' }, { status: 500 });
    }

    await logEvent('social_post_skipped', { id: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to skip post';
    await logEvent('social_skip_error', { id: params.id, error: message });
    return NextResponse.json({ error: 'Failed to skip post' }, { status: 500 });
  }
}
