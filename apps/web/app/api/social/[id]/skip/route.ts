import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, logEvent } from '@realty-engine/core';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    await supabase
      .from('social_posts')
      .update({ status: 'failed' })
      .eq('id', params.id);

    await logEvent('social_post_skipped', { id: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to skip post' }, { status: 500 });
  }
}
