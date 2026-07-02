/**
 * Adds (or resets) the single "live demo" lead — Naina Sachdev — under the
 * Orchid Developers demo client, status 'new' (not called yet). Run after
 * seed:demo. Idempotent: removes any prior lead with the same phone first.
 *
 *   npx tsx scripts/add-demo-lead.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PHONE = '+918956299562';
const EMAIL = 'nainasachdev01@gmail.com';

async function main() {
  // Prefer the flagship luxury project; fall back to any demo project.
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('public_slug', 'the-crest-worli')
    .single();

  let projectId = project?.id ?? null;
  if (!projectId) {
    const { data: any } = await supabase.from('projects').select('id, name').limit(1).single();
    projectId = any?.id ?? null;
  }
  if (!projectId) throw new Error('No project found — run `pnpm seed:demo` first.');

  // Idempotent: clear any prior lead with this phone (cascades call_logs/messages).
  await supabase.from('leads').delete().eq('phone_e164', PHONE);

  const { data: lead, error } = await supabase
    .from('leads')
    .insert([{
      project_id: projectId,
      full_name: 'Naina Sachdev',
      phone_e164: PHONE,
      email: EMAIL,
      source: 'manual',
      status: 'new',
      score: 0,
      language_pref: 'hinglish',
      location_city: 'Mumbai',
      notes: 'Live demo lead — trigger call, then Sync from Bolna.',
    }])
    .select('id')
    .single();

  if (error) throw error;

  console.log('\n✅  Demo lead ready');
  console.log('   Name    : Naina Sachdev');
  console.log('   Phone   :', PHONE, '(will RECEIVE the call)');
  console.log('   Email   :', EMAIL);
  console.log('   Status  : new (not called)');
  console.log('   Project :', project?.name ?? projectId);
  console.log('   Open    : /leads/' + lead!.id);
}

main().catch((e) => { console.error(e); process.exit(1); });
