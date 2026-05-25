import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

const Schema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  segment: z.enum(['luxury', 'premium', 'mid', 'affordable', 'plot']).optional(),
  unit_type: z.string().optional(),
  price_min_lakhs: z.number().min(0).optional(),
  price_max_lakhs: z.number().min(0).optional(),
  rera_number: z.string().optional(),
  brochure_url: z.string().optional(),
  hero_image_url: z.string().optional(),
  usp_bullets: z.array(z.string()).optional(),
  developer_about: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

function makeSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export async function POST(request: NextRequest) {
  // Verify authenticated session
  const authClient = createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const email = user.email.toLowerCase();
  const db = getSupabaseServer();

  // Derive client_id from the authenticated user's email — never trust the request body
  const { data: client } = await db
    .from('clients')
    .select('id, name')
    .or(`contact_email.eq.${email},portal_allowed_emails.cs.{${email}}`)
    .eq('status', 'active')
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: 'No active client account found for this user' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = Schema.parse(body);

    // Find a unique public_slug
    const baseSlug = makeSlug(validated.name);
    let publicSlug = baseSlug;
    let attempt = 0;
    while (true) {
      const candidate = attempt === 0 ? publicSlug : `${baseSlug}-${attempt}`;
      const { data: conflict } = await db.from('projects').select('id').eq('public_slug', candidate).maybeSingle();
      if (!conflict) { publicSlug = candidate; break; }
      attempt++;
    }

    const { data: project, error } = await db
      .from('projects')
      .insert({
        client_id: client.id,
        name: validated.name,
        location: validated.location ?? null,
        segment: validated.segment ?? null,
        unit_type: validated.unit_type ?? null,
        price_min_paise: validated.price_min_lakhs ? Math.round(validated.price_min_lakhs * 100_000) : null,
        price_max_paise: validated.price_max_lakhs ? Math.round(validated.price_max_lakhs * 100_000) : null,
        rera_number: validated.rera_number || null,
        public_slug: publicSlug,
        brochure_url: validated.brochure_url || null,
        hero_image_url: validated.hero_image_url || null,
        usp_bullets: validated.usp_bullets?.filter(Boolean) ?? [],
        developer_about: validated.developer_about || null,
        key_amenities: validated.amenities?.length ? { items: validated.amenities.filter(Boolean) } : null,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Failed to create project', detail: error?.message }, { status: 500 });
    }

    // Notify admin via events table
    await db.from('events').insert({
      project_id: project.id,
      kind: 'project_submitted',
      payload: { clientId: client.id, clientName: client.name, projectName: validated.name },
    });

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
