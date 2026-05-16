import Link from 'next/link';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

async function getClientBySlug(slug: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug, contact_email')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();
  return data;
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const client = await getClientBySlug(params.slug);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white">
      {/* Top nav */}
      <nav className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span
              className="font-serif text-lg font-bold text-[#d4af37]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {client?.brand_name ?? client?.name ?? 'Realty Engine'}
            </span>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <Link href={`/portal/${params.slug}`} className="hover:text-[#d4af37] transition-colors">
                Overview
              </Link>
              <Link href={`/portal/${params.slug}/leads`} className="hover:text-[#d4af37] transition-colors">
                Leads
              </Link>
              {client && (
                <Link href={`/portal/${params.slug}/projects`} className="hover:text-[#d4af37] transition-colors">
                  Projects
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-white/40">{user.email}</span>
            )}
            {user && (
              <form action={`/portal/${params.slug}/logout`} method="POST">
                <button
                  type="submit"
                  className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
