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
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header
        className="mb-10 flex flex-col gap-4 border-b pb-8 md:flex-row md:items-end md:justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div>
          <p
            className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            {client.brand_name ?? client.name}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            Projects
          </h1>
          <p className="mt-3 text-[14px] text-gray-400 leading-relaxed">
            {projects.length} active project{projects.length === 1 ? '' : 's'} in your portfolio
          </p>
        </div>
        <Link
          href={`/portal/${params.slug}/projects/new`}
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-[12px] font-bold uppercase tracking-[0.18em] transition hover:opacity-90"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          + Submit Project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div
          className="rounded-2xl border p-16 text-center"
          style={{
            backgroundColor: '#090909',
            borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <p className="text-xl font-black tracking-tight text-white">
            No projects added yet
          </p>
          <p className="mt-3 text-[14px] text-gray-500 leading-relaxed">
            Your account manager will add your projects shortly.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any) => (
              <Link
                key={p.id}
                href={`/portal/${params.slug}/projects/${p.id}`}
                className="group relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
                style={{
                  backgroundColor: '#090909',
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
                  }}
                />
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={
                      p.segment === 'luxury'
                        ? {
                            backgroundColor: 'rgba(212,175,55,0.10)',
                            borderColor: 'rgba(212,175,55,0.18)',
                            color: '#D4AF37',
                          }
                        : p.segment === 'premium'
                        ? {
                            backgroundColor: 'rgba(59,130,246,0.10)',
                            borderColor: 'rgba(59,130,246,0.30)',
                            color: 'rgb(147,197,253)',
                          }
                        : {
                            backgroundColor: 'rgba(34,197,94,0.10)',
                            borderColor: 'rgba(34,197,94,0.30)',
                            color: 'rgb(134,239,172)',
                          }
                    }
                  >
                    {p.segment}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      color: p.status === 'active' ? 'rgb(74,222,128)' : 'rgb(75,85,99)',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <h3 className="mb-1 text-lg font-black tracking-tight text-white transition-colors group-hover:text-[#D4AF37]">
                  {p.name}
                </h3>
                <p className="text-[13px] text-gray-500">{p.location}</p>
                <p className="mt-2 text-[12px] text-gray-600">{p.unit_type}</p>
                <div
                  className="mt-5 border-t pt-4"
                  style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <p className="font-mono text-sm font-bold" style={{ color: '#D4AF37' }}>
                    {fmtPaise(p.price_min_paise)}
                    {p.price_max_paise && p.price_min_paise !== p.price_max_paise
                      ? ` – ${fmtPaise(p.price_max_paise)}`
                      : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href={`/portal/${params.slug}/projects/new`}
              className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] transition hover:bg-white/[0.04]"
              style={{
                borderColor: 'rgba(212,175,55,0.18)',
                backgroundColor: 'rgba(212,175,55,0.05)',
                color: '#D4AF37',
              }}
            >
              + Submit another project
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
