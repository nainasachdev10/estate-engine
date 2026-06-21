import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@realty-engine/core';
import { createSupabaseServerClient } from '@/utils/supabase/server';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const email = user?.email?.toLowerCase() ?? '';
  if (!email || !getAdminEmails().includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
