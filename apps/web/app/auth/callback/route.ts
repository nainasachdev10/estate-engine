import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function resolvePortalSlug(email: string): Promise<string | null> {
  try {
    const db = getSupabaseServer();
    const { data, error } = await db
      .from('clients')
      .select('id, slug')
      .or(`contact_email.eq.${email},portal_allowed_emails.cs.{${email}}`)
      .maybeSingle();
    if (error || !data) return null;
    return (data.slug ?? data.id) as string;
  } catch {
    return null;
  }
}

/**
 * OAuth / magic-link callback.
 *
 * Critical: cookies set by exchangeCodeForSession must be applied to the
 * SAME NextResponse that gets returned — not a throw-away intermediate object.
 * We collect them in an array and stamp them onto the final redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  const collectedCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            collectedCookies.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    },
  );

  let email: string | null = null;
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) {
      return NextResponse.redirect(`${origin}/auth/auth-error`);
    }
    email = data.user.email.toLowerCase();
  } catch {
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  // Determine destination by role
  let destination = `${origin}/request-access`;
  if (getAdminEmails().includes(email)) {
    const explicit = searchParams.get('redirectTo') ?? searchParams.get('next');
    destination = explicit?.startsWith('/') ? `${origin}${explicit}` : `${origin}/pipeline`;
  } else {
    const slug = await resolvePortalSlug(email);
    if (slug) destination = `${origin}/portal/${slug}`;
  }

  const response = NextResponse.redirect(destination);
  // Stamp the auth cookies onto the response we actually return
  collectedCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });
  return response;
}
