import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getClientProjects(slug: string) {
  const supabase = getSupabaseServer();

  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug')
    .eq('slug', slug)
    .maybeSingle();

  let client = bySlug;
  if (!client && UUID_RE.test(slug)) {
    const { data: byId } = await supabase
      .from('clients')
      .select('id, name, brand_name, slug')
      .eq('id', slug)
      .maybeSingle();
    client = byId;
  }
  if (!client) return null;

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, location, segment, unit_type, price_min_paise, price_max_paise, status')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  return { client, projects: projects ?? [] };
}

function fmtPaise(p: number | null) {
  if (!p) return '—';
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(1)} Cr`;
  return `₹${(p / 100_000).toFixed(0)} L`;
}

export default async function PortalProjectsPage({ params }: { params: { slug: string } }) {
  const data = await getClientProjects(params.slug);
  if (!data) notFound();
  const { client, projects } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-[#d4af37]">{client.brand_name ?? client.name}</p>
          <h1 className="font-serif text-3xl font-bold text-[#d4af37]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            Projects
          </h1>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p: any) => (
          <Link
            key={p.id}
            href={`/portal/${params.slug}/projects/${p.id}`}
            className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#d4af37]/40 transition-colors"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                p.segment === 'luxury' ? 'bg-[#d4af37]/20 text-[#d4af37]' :
                p.segment === 'premium' ? 'bg-blue-900/50 text-blue-300' :
                'bg-green-900/50 text-green-300'
              }`}>{p.segment}</span>
              <span className={`text-xs ${p.status === 'active' ? 'text-green-400' : 'text-white/40'}`}>
                {p.status}
              </span>
            </div>
            <h3 className="mb-1 font-serif text-lg text-white group-hover:text-[#d4af37] transition-colors">
              {p.name}
            </h3>
            <p className="text-sm text-white/50">{p.location}</p>
            <p className="mt-2 text-sm text-white/40">{p.unit_type}</p>
            <p className="mt-3 font-mono text-sm text-[#d4af37]">
              {fmtPaise(p.price_min_paise)}
              {p.price_max_paise && p.price_min_paise !== p.price_max_paise ? ` – ${fmtPaise(p.price_max_paise)}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
