import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DASHBOARD_PATHS = [
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Supabase refresh session cookies first
  let supabaseResponse = NextResponse.next({ request });
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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect main dashboard routes
  const isDashboard = DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isDashboard && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from /login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/pipeline', request.url));
  }

  // Portal auth (preserve existing logic)
  if (
    pathname.startsWith('/portal') &&
    !pathname.endsWith('/login') &&
    !pathname.includes('/auth/callback')
  ) {
    if (!user) {
      const slug = pathname.split('/')[2];
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = `/portal/${slug}/login`;
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify this user's email is allowed to view this client's portal
    const slug = pathname.split('/')[2];
    if (slug && user.email) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
      let client: {
        contact_email: string | null;
        portal_allowed_emails: string[] | null;
      } | null = null;

      const { data: bySlug } = await supabase
        .from('clients')
        .select('contact_email, portal_allowed_emails')
        .eq('slug', slug)
        .maybeSingle();

      if (bySlug) {
        client = bySlug;
      } else if (isUuid) {
        const { data: byId } = await supabase
          .from('clients')
          .select('contact_email, portal_allowed_emails')
          .eq('id', slug)
          .maybeSingle();
        client = byId;
      }

      if (!client) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/portal/${slug}/login`;
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }

      const allowed = [
        client.contact_email,
        ...(client.portal_allowed_emails ?? []),
      ]
        .filter((e): e is string => typeof e === 'string' && e.length > 0)
        .map((e) => e.toLowerCase());

      if (
        allowed.length === 0 ||
        !allowed.includes(user.email.toLowerCase())
      ) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/portal/${slug}/login`;
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
