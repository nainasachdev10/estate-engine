import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateImage } from '@realty-engine/content';
import { createSupabaseServerClient } from '@/utils/supabase/server';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const BodySchema = z.object({
  creativeId: z.string().uuid(),
});

// Map creative placement/name hints to aspect ratio for image generation
function aspectRatioFor(name: string | null): '1:1' | '9:16' | '16:9' {
  if (!name) return '1:1';
  const n = name.toLowerCase();
  if (n.includes('story') || n.includes('reel') || n.includes('9:16')) return '9:16';
  if (n.includes('landscape') || n.includes('cover') || n.includes('16:9')) return '16:9';
  return '1:1'; // feed / square default
}

// Build a prompt tuned for luxury Indian real estate imagery
function buildImagePrompt(
  headline: string | null,
  primaryText: string | null,
  segment: string | null,
  projectName: string,
  uspBullets: string[] | null
): string {
  const tier =
    segment === 'luxury'
      ? 'ultra-luxury'
      : segment === 'premium'
      ? 'premium'
      : segment === 'plot'
      ? 'plotted development'
      : 'residential';

  const usps = uspBullets?.slice(0, 3).join(', ') ?? '';
  const headlineText = headline ?? projectName;
  const bodyText = primaryText ? ` ${primaryText.slice(0, 120)}` : '';

  return [
    `Architectural photograph of a ${tier} Indian real estate development "${projectName}".`,
    usps ? `Key features: ${usps}.` : '',
    `Ad headline: "${headlineText}".${bodyText}`,
    'Cinematic lighting, golden hour, photorealistic render, aspirational lifestyle.',
    'No text overlays, no watermarks, high detail, magazine quality.',
  ]
    .filter(Boolean)
    .join(' ');
}

export async function POST(request: NextRequest) {
  // Auth — must be a logged-in admin
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const email = user?.email?.toLowerCase() ?? '';
  if (!email || !getAdminEmails().includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { creativeId } = BodySchema.parse(json);

    const supabase = getSupabaseServer();

    // Load the campaign row (what the codebase calls "ad creative")
    const { data: creative, error: creativeErr } = await supabase
      .from('campaigns')
      .select('id, project_id, name, headline, primary_text, status')
      .eq('id', creativeId)
      .single();

    if (creativeErr || !creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Load the project for segment + USP bullets
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('id, name, segment, usp_bullets')
      .eq('id', creative.project_id)
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const aspectRatio = aspectRatioFor(creative.name);
    const prompt = buildImagePrompt(
      creative.headline,
      creative.primary_text,
      project.segment,
      project.name,
      project.usp_bullets ?? null
    );

    const { url, generation_id } = await generateImage({
      prompt,
      aspect_ratio: aspectRatio,
      model: 'higgsfield-ai/soul/standard',
    });

    // Persist to ad_creative_media (migration pending from agent-foundations)
    const { error: insertErr } = await supabase.from('ad_creative_media').insert({
      creative_id: creativeId,
      type: 'image',
      url,
      generation_id,
      status: 'ready',
    });

    if (insertErr) {
      // Log but don't fail — the URL is still returned to the caller
      await logEvent(
        'higgsfield_media_save_failed',
        { error: insertErr.message, generation_id },
        { projectId: project.id }
      );
    }

    await logEvent(
      'higgsfield_image_generated',
      { generation_id, aspect_ratio: aspectRatio, creative_id: creativeId },
      { projectId: project.id }
    );

    return NextResponse.json({ success: true, mediaUrl: url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('higgsfield_image_route_error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
