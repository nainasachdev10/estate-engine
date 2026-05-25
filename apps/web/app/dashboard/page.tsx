import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Smart dashboard redirect — routes each user type to the right home.
 * Used as the target for all landing page CTAs so admins, clients,
 * and new visitors all land in the correct place without a redirect loop.
 *
 *   Admin   → /pipeline
 *   Client  → /portal/[slug]
 *   Unknown → /request-access
 *   No auth → /login?redirectTo=/dashboard
 */
export default async function DashboardRedirectPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login?redirectTo=/dashboard');
  }

  const email = user.email.toLowerCase();

  if (getAdminEmails().includes(email)) {
    redirect('/pipeline');
  }

  const db = getSupabaseServer();
  const { data: client } = await db
    .from('clients')
    .select('id, slug')
    .or(`contact_email.eq.${email},portal_allowed_emails.cs.{${email}}`)
    .eq('status', 'active')
    .maybeSingle();

  if (client) {
    redirect(`/portal/${client.slug ?? client.id}`);
  }

  redirect('/request-access');
}
