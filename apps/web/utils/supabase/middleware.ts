import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith('/portal') && !path.endsWith('/login') && !path.includes('/auth/callback')) {
    if (!user) {
      const slug = path.split('/')[2];
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = `/portal/${slug}/login`;
      loginUrl.searchParams.set('redirectTo', path);
      return NextResponse.redirect(loginUrl);
    }

    // Verify this user's email is allowed to view this client's portal
    const slug = path.split('/')[2];
    if (slug && user.email) {
      // Safe lookup: try slug first, then only fall back to id if it looks like a UUID
      const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
      let client: { contact_email: string | null; portal_allowed_emails: string[] | null } | null = null;

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

      // Fail closed: if client found, require email match. If no client found, deny.
      if (!client) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/portal/${slug}/login`;
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }

      const allowed = [
        client.contact_email,
        ...(client.portal_allowed_emails ?? []),
      ].filter((e): e is string => typeof e === 'string' && e.length > 0)
       .map((e) => e.toLowerCase());

      // Fail closed: deny if no emails configured OR if user's email not in list
      if (allowed.length === 0 || !allowed.includes(user.email.toLowerCase())) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/portal/${slug}/login`;
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return supabaseResponse;
}
