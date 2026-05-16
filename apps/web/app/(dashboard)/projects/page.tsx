import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getProjects() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, location, segment, public_slug, price_min_paise, price_max_paise, clients(name, brand_name)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

function fmtPaiseRange(min: number | null, max: number | null): string {
  const fmt = (p: number) => (p >= 10_000_000 ? `₹${(p / 10_000_000).toFixed(1)} Cr` : `₹${(p / 100_000).toFixed(0)} L`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return '—';
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-gold">Projects</h1>
        <p className="text-sm text-gray-400 mt-1">All client projects · {projects.length} total</p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center text-gray-400">
          No projects yet. Run <code className="text-gold">pnpm seed</code> to create demo data.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any) => (
            <div key={p.id} className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                {p.clients?.brand_name ?? p.clients?.name}
              </p>
              <h3 className="font-serif text-xl text-gold">{p.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{p.location ?? '—'} · {p.segment ?? '—'}</p>
              <p className="mt-2 text-sm font-mono text-gray-300">{fmtPaiseRange(p.price_min_paise, p.price_max_paise)}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/projects/${p.id}/creatives`}
                  className="rounded border border-dark-tertiary px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-tertiary hover:text-gold"
                >
                  Creatives
                </Link>
                {p.public_slug && (
                  <a
                    href={`/p/${p.public_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-gold/10 border border-gold/30 px-3 py-1.5 text-xs text-gold hover:bg-gold/20"
                  >
                    View landing page →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
