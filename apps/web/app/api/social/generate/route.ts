import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateSocialMonth } from '@realty-engine/content';
import { requireInternalToken } from '@/utils/api-auth';

const BodySchema = z.object({
  projectId: z.string().uuid(),
  days: z.number().int().min(1).max(60).default(30),
});

export async function POST(request: NextRequest) {
  const authError = requireInternalToken(request);
  if (authError) return authError;

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
      caption: p.caption,
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
