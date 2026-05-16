import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateAdCreatives, type AdVariant } from '@realty-engine/content';
import { requireInternalToken } from '@/utils/api-auth';

const BodySchema = z.object({
  projectId: z.string().uuid(),
});

function platformFor(variant: AdVariant): 'meta' | 'google' | '99acres' {
  if (variant.type === 'meta_single' || variant.type === 'meta_video') return 'meta';
  if (variant.type === 'google_search' || variant.type === 'google_display') return 'google';
  return '99acres';
}

function headlineFor(variant: AdVariant): string {
  if (variant.type === 'meta_single') return variant.headline;
  if (variant.type === 'meta_video') return `${variant.duration} video script`;
  if (variant.type === 'google_search') return variant.headlines[0] ?? '';
  if (variant.type === 'google_display') return variant.headline;
  return variant.title;
}

function primaryTextFor(variant: AdVariant): string {
  if (variant.type === 'meta_single') return variant.primary_text;
  if (variant.type === 'meta_video') return variant.voiceover;
  if (variant.type === 'google_search') return variant.descriptions[0] ?? '';
  if (variant.type === 'google_display') return variant.description;
  return variant.description;
}

export async function POST(request: NextRequest) {
  const authError = requireInternalToken(request);
  if (authError) return authError;

  try {
    const json = await request.json();
    const { projectId } = BodySchema.parse(json);

    const supabase = getSupabaseServer();
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('*, clients(*)')
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const variants = await generateAdCreatives(project, project.clients);

    // Save each variant as a campaign row
    const inserts = variants.map((v) => ({
      project_id: projectId,
      platform: platformFor(v),
      name: v.type,
      status: 'draft' as const,
      headline: headlineFor(v),
      primary_text: primaryTextFor(v),
      external_campaign_id: null,
    }));

    const { data: saved, error: insertErr } = await supabase
      .from('campaigns')
      .insert(inserts)
      .select();

    if (insertErr) {
      await logEvent('creatives_save_failed', { error: insertErr.message }, { projectId });
      return NextResponse.json({ error: 'Failed to save creatives' }, { status: 500 });
    }

    await logEvent(
      'creatives_generated',
      { count: variants.length, projectId },
      { projectId }
    );

    return NextResponse.json({ variants, campaigns: saved });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('creatives_error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
