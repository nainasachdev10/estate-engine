import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/api-auth';
import { z } from 'zod';
import { getSupabaseServer } from '@realty-engine/core';

const ProjectSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1),
  location: z.string().optional(),
  segment: z.enum(['luxury', 'premium', 'mid', 'affordable', 'plot']).optional(),
  unit_type: z.string().optional(),
  price_min_lakhs: z.number().min(0).optional(),
  price_max_lakhs: z.number().min(0).optional(),
  rera_number: z.string().optional(),
  public_slug: z.string().optional(),
  brochure_url: z.string().optional(),
  hero_image_url: z.string().optional(),
  usp_bullets: z.array(z.string()).optional(),
  developer_about: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft']).default('active'),
  site_address: z.string().optional(),
  possession_date: z.string().optional(),
  total_units: z.number().int().min(1).optional(),
  available_units: z.number().int().min(0).optional(),
  site_contact_name: z.string().optional(),
  site_contact_phone: z.string().optional(),
  video_url: z.string().optional(),
  buyer_profile: z.string().optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
});

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const validated = ProjectSchema.parse(body);
    const db = getSupabaseServer();

    // Resolve unique public_slug
    const baseSlug = makeSlug(validated.public_slug || validated.name);
    let publicSlug = baseSlug;
    let attempt = 0;
    while (true) {
      const candidate = attempt === 0 ? publicSlug : `${baseSlug}-${attempt}`;
      const { data: conflict } = await db
        .from('projects')
        .select('id')
        .eq('public_slug', candidate)
        .maybeSingle();
      if (!conflict) { publicSlug = candidate; break; }
      attempt++;
    }

    const { data: project, error } = await db
      .from('projects')
      .insert({
        client_id: validated.client_id,
        name: validated.name,
        location: validated.location ?? null,
        segment: validated.segment ?? null,
        unit_type: validated.unit_type ?? null,
        // Convert lakhs → stored unit (1 lakh = 100,000)
        price_min_paise: validated.price_min_lakhs ? Math.round(validated.price_min_lakhs * 100_000) : null,
        price_max_paise: validated.price_max_lakhs ? Math.round(validated.price_max_lakhs * 100_000) : null,
        rera_number: validated.rera_number || null,
        public_slug: publicSlug,
        brochure_url: validated.brochure_url || null,
        hero_image_url: validated.hero_image_url || null,
        usp_bullets: validated.usp_bullets?.filter(Boolean) ?? [],
        developer_about: validated.developer_about || null,
        key_amenities: validated.amenities?.length
          ? { items: validated.amenities.filter(Boolean) }
          : null,
        site_address: validated.site_address || null,
        possession_date: validated.possession_date || null,
        total_units: validated.total_units ?? null,
        available_units: validated.available_units ?? null,
        site_contact_name: validated.site_contact_name || null,
        site_contact_phone: validated.site_contact_phone || null,
        video_url: validated.video_url || null,
        buyer_profile: validated.buyer_profile || null,
        faq: validated.faq?.length ? { items: validated.faq } : null,
        status: validated.status,
      })
      .select('id, public_slug')
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Failed to create project', detail: error?.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, projectId: project.id, publicSlug: project.public_slug });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
