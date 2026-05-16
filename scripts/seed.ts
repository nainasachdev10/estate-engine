import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_PHONE = process.env.TEST_PHONE;

async function seed() {
  console.log('Seeding test data...');

  // 1. Wipe existing demo rows so seed is idempotent
  await supabase.from('clients').delete().eq('slug', 'orchid-developers');

  // 2. Create test client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert([{
      name: 'Orchid Developers',
      brand_name: 'Orchid Developers',
      contact_email: 'sales@orchiddevelopers.com',
      contact_phone: '+912212345678',
      gold_color_hex: '#d4af37',
      status: 'active',
      monthly_fee_paise: 5000000,
      slug: 'orchid-developers',
      brand_voice_notes:
        'Premium, understated, trustworthy. References Mumbai/Pune heritage. Avoids hard sell.',
    }])
    .select()
    .single();

  if (clientErr) {
    console.error('Client insert failed:', clientErr.message);
    process.exit(1);
  }
  console.log('Client created:', client.id);

  // 3. Create 3 demo projects per spec
  const projects = [
    {
      client_id: client.id,
      name: 'The Crest, Worli',
      location: 'Worli, Mumbai',
      segment: 'luxury' as const,
      unit_type: '3 BHK & 4 BHK Sea-View Residences',
      price_min_paise: 85_000_00_000, // ₹8.5 Cr
      price_max_paise: 150_000_00_000, // ₹15 Cr
      public_slug: 'the-crest-worli',
      rera_number: 'P51800012345',
      hero_image_url: null,
      gallery_urls: null,
      floor_plan_urls: null,
      usp_bullets: [
        'Direct Arabian Sea views from every residence',
        'Hand-selected Calacatta marble and Italian fittings',
        'Private concierge and chauffeured fleet on call',
        '24-hour butler service and curated wellness rituals',
        '12-acre gated estate with only 38 residences',
        'Helipad-ready rooftop and private dining pavilion',
      ],
      developer_about:
        'Orchid Developers have delivered 14 landmark addresses across South Mumbai over four decades. Every Orchid residence is a study in restraint — Italian craftsmanship, Indian sensibility, and an unbroken record of on-time possession.',
      key_amenities: {
        wellness: ['Infinity pool', 'Spa & wellness suites', 'Yoga deck'],
        social: ['Private dining pavilion', 'Cigar lounge', 'Curated library'],
        outdoor: ['Sky garden', 'Reflexology path'],
      },
      status: 'active',
    },
    {
      client_id: client.id,
      name: 'Skyline Heights, Pune',
      location: 'Hinjewadi, Pune',
      segment: 'premium' as const,
      unit_type: '2 & 3 BHK Premium Homes',
      price_min_paise: 15_000_00_000, // ₹1.5 Cr
      price_max_paise: 30_000_00_000, // ₹3 Cr
      public_slug: 'skyline-heights-pune',
      rera_number: 'P52100023456',
      hero_image_url: null,
      gallery_urls: null,
      floor_plan_urls: null,
      usp_bullets: [
        '10-minute drive to Hinjewadi IT Phase 2',
        'Walk to two top-rated international schools',
        'Sky-deck with the Western Ghats panorama',
        'Smart-home automation pre-installed',
        'Possession in March 2027 — escrow guaranteed',
        'Vastu-compliant layouts approved by architect Hafeez Contractor',
      ],
      developer_about:
        'Orchid Developers brings 40 years of South Mumbai heritage to Pune. Skyline Heights is built on the principle that working families deserve smart layouts, premium finishes, and a builder who shows up on possession day.',
      key_amenities: {
        outdoor: ['Sky-deck pool', 'Jogging track'],
        indoor: ['Clubhouse', 'Co-working lounge', 'Indoor sports'],
        kids: ['Crèche', 'Tutoring room'],
      },
      status: 'active',
    },
    {
      client_id: client.id,
      name: 'Green Acres, Lonavala',
      location: 'Lonavala, Maharashtra',
      segment: 'plot' as const,
      unit_type: 'NA-approved investment plots, 1500–2400 sqft',
      price_min_paise: 250_000_000, // ₹25 L = 25_00_000 rupees * 100
      price_max_paise: 600_000_000, // ₹60 L
      public_slug: 'green-acres-lonavala',
      rera_number: 'P52000034567',
      hero_image_url: null,
      gallery_urls: null,
      floor_plan_urls: null,
      usp_bullets: [
        'NA-approved with clear title — ready to register today',
        '2 hours from Mumbai, 1 hour from Pune Expressway exit',
        'Gated layout with 24/7 security and internal roads',
        '40+ plots already sold in Phase 1',
        'Construction-ready with water and electricity connections',
        'Easy bank loans — partner banks pre-approved',
      ],
      developer_about:
        'Green Acres is Orchid Developers\' first plotting venture, bringing the same documentation rigor and trust they\'re known for in luxury residential. Every plot is RERA-approved and title-cleared by a top Mumbai law firm.',
      key_amenities: {
        infra: ['Internal tar roads', 'Underground utilities', 'Water connection'],
        security: ['Gated entry', '24/7 CCTV'],
        community: ['Community lawn', 'Children\'s play area'],
      },
      status: 'active',
    },
  ];

  const createdProjects: any[] = [];
  for (const p of projects) {
    const { data: proj, error: pErr } = await supabase
      .from('projects')
      .insert([p])
      .select()
      .single();
    if (pErr) {
      console.error(`Project ${p.name} insert failed:`, pErr.message);
      continue;
    }
    createdProjects.push(proj);
    console.log(`Project created: ${proj.name} (/p/${proj.public_slug})`);
  }

  // 4. Optionally create 3 test leads on the luxury project if TEST_PHONE is set
  if (TEST_PHONE && createdProjects[0]) {
    const luxury = createdProjects[0];
    const testLeads = [
      { full_name: 'Test Lead One', phone_e164: TEST_PHONE, source: 'meta' as const, source_meta: { campaign_id: 'test_001' } },
      { full_name: 'Test Lead Two', phone_e164: TEST_PHONE, source: 'google' as const, source_meta: { keyword: 'luxury flats worli' } },
      { full_name: 'Test Lead Three', phone_e164: TEST_PHONE, source: 'manual' as const, source_meta: null },
    ];

    await supabase.from('leads').delete().eq('phone_e164', TEST_PHONE);

    for (const lead of testLeads) {
      const { error: leadErr } = await supabase
        .from('leads')
        .insert([{
          project_id: luxury.id,
          ...lead,
          status: 'new',
          score: 0,
          language_pref: 'hinglish',
          location_country: 'India',
        }]);
      if (leadErr) console.error('Lead insert failed:', leadErr.message);
      else console.log(`Lead created: ${lead.full_name}`);
    }
  } else if (!TEST_PHONE) {
    console.log('TEST_PHONE not set — skipping test lead creation');
  }

  console.log('\nSeed complete.\n');
  console.log(`Client ID: ${client.id}`);
  console.log(`Client portal: /portal/${client.slug}`);
  console.log('\nLanding pages:');
  createdProjects.forEach((p) => console.log(`  /p/${p.public_slug}`));
  console.log('\nAdd this to apps/web/.env.local:');
  console.log(`TEST_PROJECT_ID=${createdProjects[0]?.id ?? ''}`);
}

seed().catch(console.error);
