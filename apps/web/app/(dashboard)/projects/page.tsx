import Link from 'next/link';
import { ExternalLink, MapPin, Home, Plus } from 'lucide-react';
import { getSupabaseServer } from '@realty-engine/core';
import ActivateButton from './activate-button';
import WebhookUrls from './webhook-urls';

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://estate-engine.vercel.app';
}

export const dynamic = 'force-dynamic';

interface ProjectRow {
  id: string;
  name: string;
  location: string | null;
  segment: 'luxury' | 'premium' | 'mid' | 'affordable' | 'plot' | null;
  unit_type: string | null;
  public_slug: string | null;
  rera_number: string | null;
  price_min_paise: number | null;
  price_max_paise: number | null;
  status: string | null;
  clients: { name: string; brand_name: string | null } | { name: string; brand_name: string | null }[] | null;
}

interface LeadCountRow {
  project_id: string;
  status: string;
}

async function getProjects(): Promise<ProjectRow[]> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('projects')
      .select(
        'id, name, location, segment, unit_type, public_slug, rera_number, price_min_paise, price_max_paise, status, clients(name, brand_name)',
      )
      .order('created_at', { ascending: false });
    return (data ?? []) as ProjectRow[];
  } catch {
    return [];
  }
}

async function getLeadCounts(
  projectIds: string[],
): Promise<Map<string, { total: number; qualified: number }>> {
  const map = new Map<string, { total: number; qualified: number }>();
  if (projectIds.length === 0) return map;
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('leads')
      .select('project_id, status')
      .in('project_id', projectIds);

    const qualifiedSet = new Set(['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won']);
    for (const row of (data ?? []) as LeadCountRow[]) {
      const cur = map.get(row.project_id) ?? { total: 0, qualified: 0 };
      cur.total += 1;
      if (qualifiedSet.has(row.status)) cur.qualified += 1;
      map.set(row.project_id, cur);
    }
  } catch {
    /* swallow */
  }
  return map;
}

function fmtPaiseRange(min: number | null, max: number | null): string {
  const fmt = (p: number) =>
    p >= 10_000_000 ? `₹${(p / 10_000_000).toFixed(1)} Cr` : `₹${(p / 100_000).toFixed(0)} L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return '—';
}

const SEGMENT_BADGE: Record<NonNullable<ProjectRow['segment']>, string> = {
  luxury: 'bg-gold/10 text-gold ring-1 ring-inset ring-gold/30',
  premium: 'bg-blue-900/40 text-blue-300 ring-1 ring-inset ring-blue-500/30',
  mid: 'bg-green-900/40 text-green-300 ring-1 ring-inset ring-green-500/30',
  affordable: 'bg-emerald-900/40 text-emerald-300 ring-1 ring-inset ring-emerald-500/30',
  plot: 'bg-green-900/40 text-green-300 ring-1 ring-inset ring-green-500/30',
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const counts = await getLeadCounts(projects.map((p) => p.id));
  const appUrl = getAppUrl();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-400">
            All client projects · {projects.length} total
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#c9a137]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-dark-tertiary bg-dark-secondary/40 p-12 text-center">
          <p className="text-base font-medium text-white">No projects yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Create your first project to activate the lead pipeline.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#c9a137]"
          >
            <Plus className="h-4 w-4" />
            Create First Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
            const c = counts.get(p.id) ?? { total: 0, qualified: 0 };
            return (
              <div
                key={p.id}
                className="group flex flex-col rounded-lg border border-dark-tertiary bg-dark-secondary p-5 transition-colors hover:border-gold/30"
              >
                {/* Top row: client + segment + draft badge */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                    {client?.brand_name ?? client?.name ?? 'Unknown client'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {p.status === 'draft' && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
                        Draft
                      </span>
                    )}
                    {p.segment && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${SEGMENT_BADGE[p.segment]}`}
                      >
                        {p.segment}
                      </span>
                    )}
                  </div>
                </div>

                <Link href={`/projects/${p.id}`} className="block">
                  <h3 className="text-base font-semibold leading-tight text-white transition-colors hover:text-gold">{p.name}</h3>
                </Link>

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                  {p.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.location}
                    </span>
                  )}
                  {p.unit_type && (
                    <span className="inline-flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {p.unit_type}
                    </span>
                  )}
                </p>

                <p className="mt-3 font-mono text-sm text-gold">
                  {fmtPaiseRange(p.price_min_paise, p.price_max_paise)}
                </p>

                {/* Lead count stats */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-dark-tertiary bg-dark-bg p-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-gray-500">Total Leads</p>
                    <p className="font-mono text-lg text-white">{c.total}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-gray-500">Qualified+</p>
                    <p
                      className={`font-mono text-lg ${c.qualified > 0 ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      {c.qualified}
                    </p>
                  </div>
                </div>

                {p.rera_number && (
                  <p className="mt-3 inline-flex w-fit rounded border border-dark-tertiary bg-dark-bg px-2 py-0.5 font-mono text-[10px] text-gray-500">
                    RERA · {p.rera_number}
                  </p>
                )}

                {/* Footer buttons */}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {p.status === 'draft' ? (
                    <>
                      <p className="w-full text-[10px] text-amber-400/70">
                        Submitted by client — review and activate to go live.
                      </p>
                      <ActivateButton projectId={p.id} />
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex-1 rounded border border-gold/30 bg-gold/10 px-3 py-1.5 text-center text-xs text-gold transition-colors hover:bg-gold/20"
                      >
                        View
                      </Link>
                      <Link
                        href={`/leads?project=${p.id}`}
                        className="flex-1 rounded border border-dark-tertiary bg-dark-bg px-3 py-1.5 text-center text-xs text-gray-200 transition-colors hover:border-gold/30 hover:text-gold"
                      >
                        Leads
                      </Link>
                      <Link
                        href={`/projects/${p.id}/creatives`}
                        className="flex-1 rounded border border-dark-tertiary bg-dark-bg px-3 py-1.5 text-center text-xs text-gray-200 transition-colors hover:border-gold/30 hover:text-gold"
                      >
                        Ads
                      </Link>
                      {p.public_slug && (
                        <a
                          href={`/p/${p.public_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-gold/30 bg-gold/10 px-3 py-1.5 text-center text-xs text-gold transition-colors hover:bg-gold/20"
                        >
                          Landing
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </>
                  )}
                </div>
                <WebhookUrls projectId={p.id} publicSlug={p.public_slug} appUrl={appUrl} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
