import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';
import PortalNav from './components/portal-nav';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const client = await getClientBySlug(params.slug);
  const brandName = client?.brand_name ?? client?.name ?? 'Realty Engine';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0a0a0a] text-white">
      <PortalNav slug={params.slug} brandName={brandName} userEmail={user?.email ?? null} />

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-[11px] text-white/40 md:flex-row">
          <span>
            Powered by{' '}
            <span className="font-serif text-[#d4af37]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              Realty Engine
            </span>
          </span>
          <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
