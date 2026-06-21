/**
 * Ensures a confirmed operator (admin) login exists for the demo, so the
 * presenter can sign in immediately without an email round-trip.
 *
 *   npx tsx scripts/ensure-admin.ts
 *
 * Email must be listed in ADMIN_EMAILS (apps/web/.env.local).
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const EMAIL = process.env.DEMO_ADMIN_EMAIL || 'nainasachdev01@gmail.com';
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'RealtyDemo2026!';

async function main() {
  // Find existing user by email
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    console.log(`✓ Updated existing admin user: ${EMAIL}`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Naina Sachdev' },
    });
    if (error) { console.error('createUser failed:', error.message); process.exit(1); }
    console.log(`✓ Created admin user: ${EMAIL}`);
  }
  console.log(`\n  Login at /login`);
  console.log(`  Email   : ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
