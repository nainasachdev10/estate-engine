import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, logEvent } from '@realty-engine/core';
import { generateVideo } from '@realty-engine/content';
import { createSupabaseServerClient } from '@/utils/supabase/server';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const BodySchema = z.object({
  creativeId: z.string().uuid(),
  imageUrl: z.string().url(),
});

// Cinematic motion prompts for luxury Indian real estate — 9:16 portrait video
// DoP is image-to-video only, so every call starts from a generated source image.
function buildVideoPrompt(
  headline: string | null,
  segment: string | null,
  projectName: string
): string {
  const headlineText = headline ?? projectName;

  // Pick a cinematic move based on segment — luxury gets drone, others get dolly/parallax
  const cameraMove =
    segment === 'luxury'
      ? 'sweeping drone aerial shot descending toward the tower at golden hour, dramatic lens flare'
      : segment === 'plot'
        ? 'slow parallax push-in over lush landscaped plots, warm sunset sky'
        : 'smooth dolly-in through grand entrance lobby, bokeh lighting';

  return [
    `Starting from the provided reference image of "${projectName}". Ad headline: "${headlineText}".`,
    `${cameraMove}.`,
    'Cinematic 9:16 vertical video. Slow motion. Aspirational lifestyle.',
    'Photorealistic, no text, no watermarks, no logos.',
    'Soft orchestral ambient audio implied. Rich warm tones.',
  ].join(' ');
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
    const { creativeId, imageUrl } = BodySchema.parse(json);

    const supabase = getSupabaseServer();

    // Load the campaign row
    const { data: creative, error: creativeErr } = await supabase
      .from('campaigns')
      .select('id, project_id, name, headline, primary_text, status')
      .eq('id', creativeId)
      .single();

    if (creativeErr || !creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Load the project for segment info
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('id, name, segment')
      .eq('id', creative.project_id)
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const prompt = buildVideoPrompt(creative.headline, project.segment, project.name);

    const model = project.segment === 'luxury' || project.segment === 'premium' ? 'turbo' : 'standard';

    const { url, generation_id } = await generateVideo({
      prompt,
      image_url: imageUrl,
      model,
    });

    // Persist to ad_creative_media (migration pending from agent-foundations)
    const { error: insertErr } = await supabase.from('ad_creative_media').insert({
      creative_id: creativeId,
      type: 'video',
      url,
      generation_id,
      status: 'ready',
    });

    if (insertErr) {
      await logEvent(
        'higgsfield_media_save_failed',
        { error: insertErr.message, generation_id, type: 'video' },
        { projectId: project.id }
      );
    }

    await logEvent(
      'higgsfield_video_generated',
      { generation_id, model, creative_id: creativeId },
      { projectId: project.id }
    );

    return NextResponse.json({ success: true, mediaUrl: url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEvent('higgsfield_video_route_error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
