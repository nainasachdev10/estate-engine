import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_PHONE = process.env.TEST_PHONE!;

if (!TEST_PHONE) {
  console.error('TEST_PHONE not set in .env.local');
  process.exit(1);
}

async function seed() {
  console.log('Seeding test data...');

  // 1. Create test client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert([{
      name: 'Orchid Developers',
      brand_name: 'Orchid Developers',
      contact_email: 'sales@orchiddevelopers.com',
      contact_phone: '+912212345678',
      gold_color_hex: '#d4af37',
      status: 'active',
      monthly_fee_paise: 5000000, // ₹50,000
    }])
    .select()
    .single();

  if (clientErr) {
    console.error('Client insert failed:', clientErr.message);
    process.exit(1);
  }
  console.log('Client created:', client.id);

  // 2. Create test project
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .insert([{
      client_id: client.id,
      name: 'Orchid Heights',
      location: 'Andheri West, Mumbai',
      segment: 'luxury',
      unit_type: '3 BHK & 4 BHK',
      price_min_paise: 250000000, // ₹2.5 Cr
      price_max_paise: 400000000, // ₹4 Cr
      key_amenities: {
        outdoor: ['Rooftop infinity pool', 'Landscaped gardens'],
        indoor: ['Clubhouse', 'Gymnasium', 'Co-working lounge'],
        security: ['24/7 CCTV', 'Concierge'],
      },
      status: 'active',
    }])
    .select()
    .single();

  if (projectErr) {
    console.error('Project insert failed:', projectErr.message);
    process.exit(1);
  }
  console.log('Project created:', project.id);

  // 3. Create 3 test leads with your phone number
  const testLeads = [
    { full_name: 'Test Lead One', phone_e164: TEST_PHONE, source: 'meta' as const, source_meta: { campaign_id: 'test_001', ad_set_id: 'adset_001' } },
    { full_name: 'Test Lead Two', phone_e164: TEST_PHONE, source: 'google' as const, source_meta: { keyword: 'luxury flats mumbai' } },
    { full_name: 'Test Lead Three', phone_e164: TEST_PHONE, source: 'manual' as const, source_meta: null },
  ];

  // Delete existing test leads for this phone number to allow re-seeding
  await supabase.from('leads').delete().eq('phone_e164', TEST_PHONE);

  for (const lead of testLeads) {
    const { data: newLead, error: leadErr } = await supabase
      .from('leads')
      .insert([{
        project_id: project.id,
        ...lead,
        status: 'new',
        score: 0,
        language_pref: 'hinglish',
        location_country: 'India',
      }])
      .select()
      .single();

    if (leadErr) {
      console.error('Lead insert failed:', leadErr.message);
    } else {
      console.log(`Lead created: ${lead.full_name} (${newLead.id})`);
    }
  }

  console.log('\nSeed complete!');
  console.log(`Client ID: ${client.id}`);
  console.log(`Project ID: ${project.id}`);
  console.log(`Test phone: ${TEST_PHONE}`);
  console.log('\nAdd these to .env.local:');
  console.log(`TEST_PROJECT_ID=${project.id}`);
}

seed().catch(console.error);
