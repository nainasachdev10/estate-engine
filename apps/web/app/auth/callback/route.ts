import { NextRequest, NextResponse } from 'next/server';
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
 * Resolves the portal slug for a client matching the given email, or null.
 * Service-role query so RLS never hides a legitimate match.
 */
async function resolvePortalSlug(email: string): Promise<string | null> {
  try {
    const db = getSupabaseServer();
    const { data: client, error } = await db
      .from('clients')
      .select('id, slug')
      .or(`contact_email.eq.${email},portal_allowed_emails.cs.{${email}}`)
      .maybeSingle();
    if (error || !client) return null;
    return (client.slug ?? client.id) as string;
  } catch {
    return null;
  }
}

/**
 * OAuth / magic-link callback.
 * Exchanges the code for a session, then routes the user by role:
 *   admin   → /pipeline
 *   client  → /portal/[slug]
 *   unknown → /request-access
 *
 * Honours an explicit ?redirectTo= only for admins (operator deep-links).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const explicitRedirect =
    searchParams.get('redirectTo') ?? searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  const supabase = createSupabaseServerClient();

  let email: string | null = null;
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) {
      return NextResponse.redirect(`${origin}/auth/auth-error`);
    }
    email = data.user.email;
  } catch {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  const normalizedEmail = email.toLowerCase();

  // 1. Admin
  if (getAdminEmails().includes(normalizedEmail)) {
    const target =
      explicitRedirect && explicitRedirect.startsWith('/')
        ? explicitRedirect
        : '/pipeline';
    return NextResponse.redirect(`${origin}${target}`);
  }

  // 2. Client
  const portalSlug = await resolvePortalSlug(normalizedEmail);
  if (portalSlug) {
    return NextResponse.redirect(`${origin}/portal/${portalSlug}`);
  }

  // 3. Unknown
  return NextResponse.redirect(`${origin}/request-access`);
}
