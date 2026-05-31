import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';
import PortalNav from './components/portal-nav';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getClientBySlug(slug: string) {
  const supabase = getSupabaseServer();
  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug, contact_email')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return bySlug;
  if (!UUID_RE.test(slug)) return null;
  const { data: byId } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug, contact_email')
    .eq('id', slug)
    .maybeSingle();
  return byId ?? null;
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
    <div className="flex min-h-screen w-full flex-col text-white" style={{ backgroundColor: '#000' }}>
      <PortalNav slug={params.slug} brandName={brandName} userEmail={user?.email ?? null} />

      <main className="flex-1">{children}</main>

      <footer
        className="mt-16 border-t"
        style={{ backgroundColor: '#050505', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-[11px] uppercase tracking-[0.18em] text-gray-600 md:flex-row">
          <span className="flex items-center gap-2">
            <span>Powered by</span>
            <span
              className="font-serif normal-case tracking-normal"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#D4AF37', fontSize: '13px' }}
            >
              Realty Engine
            </span>
          </span>
          <span className="normal-case tracking-normal text-gray-600">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
