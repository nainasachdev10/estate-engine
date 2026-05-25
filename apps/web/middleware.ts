import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Admin-only routes — require email listed in ADMIN_EMAILS.
const ADMIN_ROUTE_PREFIXES = [
  '/pipeline',
  '/leads',
  '/projects',
  '/analytics',
  '/campaigns',
  '/social',
  '/bulk-upload',
  '/health',
  '/requests',
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
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getPortalSlug(pathname: string): string | null {
  const match = pathname.match(/^\/portal\/([^/]+)(?:\/.*)?$/);
  return match ? match[1] : null;
}

/**
 * Copy refreshed auth cookies from the carrier response onto a redirect.
 * Without this, Supabase token refreshes are silently discarded on every
 * redirect, and the browser never receives the updated access token.
 */
function withCookies(redirect: NextResponse, carrier: NextResponse): NextResponse {
  carrier.cookies.getAll().forEach(({ name, value, ...rest }) => {
    redirect.cookies.set(name, value, rest as Parameters<typeof redirect.cookies.set>[2]);
  });
  return redirect;
}

function redirectToLogin(request: NextRequest, carrier: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
  return withCookies(NextResponse.redirect(url), carrier);
}

function redirectTo(request: NextRequest, pathname: string, carrier: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return withCookies(NextResponse.redirect(url), carrier);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Carrier response: lets the SSR client refresh auth cookies.
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
          // Write refreshed tokens back to both the request (for downstream RSC)
          // and the carrier response (so the browser gets them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user: { email?: string | null } | null = null;
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;
  } catch {
    user = null;
  }

  const email = user?.email?.toLowerCase() ?? null;
  const isAdmin = email !== null && getAdminEmails().includes(email);
  const portalSlug = getPortalSlug(pathname);
  const isPortalLogin = portalSlug !== null && pathname.endsWith('/login');

  // /login — bounce already-authenticated users to their home
  if (pathname === '/login') {
    if (email) {
      if (isAdmin) return redirectTo(request, '/pipeline', response);
      const slug = await resolvePortalSlug(supabase, email);
      if (slug) return redirectTo(request, `/portal/${slug}`, response);
      // Authenticated but no role yet — let them stay on /login (can sign out)
    }
    return response;
  }

  // /request-access — require auth to submit the form; role routing is handled at login/callback
  if (pathname === '/request-access') {
    if (!email) return redirectToLogin(request, response);
    if (isAdmin) return redirectTo(request, '/pipeline', response);
    // Authenticated non-admin users see the form (includes both known clients and unknowns)
    return response;
  }

  // Admin dashboard routes
  if (isAdminPath(pathname)) {
    if (!email) return redirectToLogin(request, response);
    if (!isAdmin) return redirectTo(request, '/request-access', response);
    return response;
  }

  // Portal routes (skip the per-portal login redirect pages)
  if (portalSlug && !isPortalLogin) {
    if (!email) return redirectToLogin(request, response);
    if (isAdmin) return response; // operators can view any portal
    const allowed = await isEmailAllowedForPortal(supabase, portalSlug, email);
    if (!allowed) return redirectTo(request, '/request-access', response);
    return response;
  }

  return response;
}

async function resolvePortalSlug(
  supabase: ReturnType<typeof createServerClient>,
  email: string,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isEmailAllowedForPortal(
  supabase: ReturnType<typeof createServerClient>,
  slug: string,
  email: string,
): Promise<boolean> {
  try {
    // Query by slug first. Only fall back to id lookup when slug is a valid UUID —
    // passing a non-UUID string to a UUID column causes a PostgreSQL parse error.
    let data: { contact_email: unknown; portal_allowed_emails: unknown } | null = null;

    const { data: bySlug } = await supabase
      .from('clients')
      .select('contact_email, portal_allowed_emails')
      .eq('slug', slug)
      .maybeSingle();

    if (bySlug) {
      data = bySlug;
    } else if (UUID_RE.test(slug)) {
      const { data: byId } = await supabase
        .from('clients')
        .select('contact_email, portal_allowed_emails')
        .eq('id', slug)
        .maybeSingle();
      data = byId;
    }

    if (!data) return false;

    const contact =
      typeof data.contact_email === 'string' ? data.contact_email.toLowerCase() : null;
    if (contact === email) return true;

    const list: string[] = Array.isArray(data.portal_allowed_emails)
      ? data.portal_allowed_emails
      : [];
    return list.some((e) => (e as string)?.toLowerCase() === email);
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
