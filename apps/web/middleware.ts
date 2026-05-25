import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Admin dashboard route prefixes — require an email listed in ADMIN_EMAILS.
const ADMIN_ROUTE_PREFIXES = [
  '/pipeline',
  '/leads',
  '/projects',
  '/analytics',
  '/campaigns',
  '/social',
  '/bulk-upload',
  '/health',
  '/settings',
];

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Extracts the slug from /portal/[slug] or /portal/[slug]/... */
function getPortalSlug(pathname: string): string | null {
  const match = pathname.match(/^\/portal\/([^/]+)(?:\/.*)?$/);
  return match ? match[1] : null;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('redirectTo', redirectTo);
  return NextResponse.redirect(url);
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Carrier response so the SSR client can refresh auth cookies onto it.
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — keeps tokens fresh for downstream RSC/handlers.
  let user: { email?: string | null } | null = null;
  try {
    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();
    user = authedUser;
  } catch {
    user = null;
  }

  const email = user?.email?.toLowerCase() ?? null;
  const isAdmin = email !== null && getAdminEmails().includes(email);

  const portalSlug = getPortalSlug(pathname);
  const isPortalLogin = portalSlug !== null && pathname.endsWith('/login');

  // --- /login: bounce already-authenticated users to their home ---
  if (pathname === '/login') {
    if (email) {
      if (isAdmin) return redirectTo(request, '/pipeline');
      const slug = await resolvePortalSlug(supabase, email);
      if (slug) return redirectTo(request, `/portal/${slug}`);
      // Authed but unrecognised — let them see /login (they can sign out).
    }
    return response;
  }

  // --- Admin dashboard routes ---
  if (isAdminPath(pathname)) {
    if (!email) return redirectToLogin(request);
    if (!isAdmin) return redirectTo(request, '/request-access');
    return response;
  }

  // --- Portal routes (skip the per-portal login page) ---
  if (portalSlug && !isPortalLogin) {
    if (!email) return redirectToLogin(request);
    if (isAdmin) return response; // operators can view any portal
    const allowed = await isEmailAllowedForPortal(supabase, portalSlug, email);
    if (!allowed) return redirectTo(request, '/request-access');
    return response;
  }

  // --- Everything else passes through ---
  return response;
}

/**
 * Finds the portal slug for a client matching the given email (anon client +
 * RLS policy "all" allows the read). Returns null on miss or error.
 */
async function resolvePortalSlug(
  supabase: ReturnType<typeof createServerClient>,
  email: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
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
 * Verifies the email is permitted to view the portal identified by slug
 * (matched on slug or id, per the portal layout's lookup convention).
 */
async function isEmailAllowedForPortal(
  supabase: ReturnType<typeof createServerClient>,
  slug: string,
  email: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('contact_email, portal_allowed_emails')
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();
    if (error || !data) return false;

    const contact =
      typeof data.contact_email === 'string'
        ? data.contact_email.toLowerCase()
        : null;
    if (contact === email) return true;

    const allowedList: string[] = Array.isArray(data.portal_allowed_emails)
      ? data.portal_allowed_emails
      : [];
    return allowedList.some((e) => e?.toLowerCase() === email);
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
