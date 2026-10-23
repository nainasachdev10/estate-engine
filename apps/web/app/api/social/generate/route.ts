import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateSocialMonth, stampRera } from '@realty-engine/content';
import { requireAdmin, requireInternalToken } from '@/utils/api-auth';

// A full month of Claude-generated posts takes minutes, not seconds.
export const maxDuration = 300;

const BodySchema = z.object({
  projectId: z.string().uuid(),
  days: z.number().int().min(1).max(60).default(30),
});

// Claude-burning route. Browser calls authenticate via the admin session
// cookie; server-to-server tooling may instead present X-Internal-Token.
// (The old internal-token-only guard was effectively public: the dashboard
// shipped the token to every visitor via NEXT_PUBLIC_INTERNAL_API_SECRET.)
export async function POST(request: NextRequest) {
  if (request.headers.get('x-internal-token')) {
    const tokenError = requireInternalToken(request);
    if (tokenError) return tokenError;
  } else {
    const authError = await requireAdmin();
    if (authError) return authError;
  }

  try {
    const json = await request.json();
    const { projectId, days } = BodySchema.parse(json);

    const supabase = getSupabaseServer();
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('*, clients(*)')
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const posts = await generateSocialMonth(project, project.clients, days);

    const inserts = posts.map((p) => ({
      project_id: projectId,
      platform: p.platform,
      post_type: p.post_type,
      caption: stampRera(p.caption, project.rera_number),
      hashtags: p.hashtags,
      media_brief: p.media_brief,
      scheduled_at: p.suggested_post_at,
      theme: p.theme,
      status: 'draft' as const,
      claude_brief: p.media_brief,
    }));

    const { data: saved, error: insertErr } = await supabase
      .from('social_posts')
      .insert(inserts)
      .select();

    if (insertErr) {
      await logEvent('social_save_failed', { error: insertErr.message }, { projectId });
      return NextResponse.json({ error: 'Failed to save posts' }, { status: 500 });
    }

    await logEvent('social_month_generated', { projectId, count: posts.length }, { projectId });

    return NextResponse.json({ count: posts.length, posts: saved });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('social_generate_error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
