import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

type RoleResult =
  | { role: 'admin' }
  | { role: 'client'; portalSlug: string }
  | { role: 'unknown' };

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * GET /api/auth/check-role
 * Resolves the authenticated user's role for client-side routing.
 * - admin  → email is listed in ADMIN_EMAILS
 * - client → email matches a client's contact_email or portal_allowed_emails
 * - unknown → authenticated but not recognised
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  let email: string | null = null;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.email) {
      return NextResponse.json({ role: 'unknown' } satisfies RoleResult, {
        status: 401,
      });
    }
    email = user.email;
  } catch {
    return NextResponse.json({ role: 'unknown' } satisfies RoleResult, {
      status: 401,
    });
  }

  const normalizedEmail = email.toLowerCase();

  // 1. Admin check
  if (getAdminEmails().includes(normalizedEmail)) {
    return NextResponse.json({ role: 'admin' } satisfies RoleResult);
  }

  // 2. Client check — service-role query so RLS never hides a match
  try {
    const db = getSupabaseServer();
    const { data: client, error } = await db
      .from('clients')
      .select('id, slug')
      .or(`contact_email.eq.${normalizedEmail},portal_allowed_emails.cs.{${normalizedEmail}}`)
      .maybeSingle();

    if (error) {
      // Fail closed: treat as unknown rather than leaking an admin/client role
      return NextResponse.json({ role: 'unknown' } satisfies RoleResult, {
        status: 200,
      });
    }

    if (client) {
      const portalSlug: string = client.slug ?? client.id;
      return NextResponse.json({
        role: 'client',
        portalSlug,
      } satisfies RoleResult);
    }
  } catch {
    return NextResponse.json({ role: 'unknown' } satisfies RoleResult, {
      status: 200,
    });
  }

  // 3. Unknown
  return NextResponse.json({ role: 'unknown' } satisfies RoleResult);
}
