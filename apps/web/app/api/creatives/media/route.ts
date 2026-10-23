import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@realty-engine/core';
import { requireAdmin } from '@/utils/api-auth';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const creativeId = request.nextUrl.searchParams.get('creativeId');
  if (!creativeId) {
    return NextResponse.json({ error: 'Missing creativeId' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: media, error } = await supabase
    .from('ad_creative_media')
    .select('id, type, url, status')
    .eq('creative_id', creativeId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: media ?? [] });
}
