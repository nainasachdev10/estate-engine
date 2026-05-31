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

const SEGMENT_LABEL: Record<NonNullable<ProjectRow['segment']>, string> = {
  luxury: 'Luxury',
  premium: 'Premium',
  mid: 'Mid',
  affordable: 'Affordable',
  plot: 'Plot',
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const counts = await getLeadCounts(projects.map((p) => p.id));
  const appUrl = getAppUrl();

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>Projects</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">Your Projects</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Manage projects and their AI modules · {projects.length} total
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border py-20 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-lg font-bold text-white">No projects yet</p>
          <p className="text-[14px] text-gray-500">
            Create your first project to activate the lead pipeline.
          </p>
          <Link
            href="/projects/new"
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            <Plus className="h-4 w-4" />
            Create First Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
            const c = counts.get(p.id) ?? { total: 0, qualified: 0 };
            const isActive = p.status === 'active';
            const isDraft = p.status === 'draft';

            return (
              <div
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:border-[rgba(255,255,255,0.13)]"
                style={
                  isActive
                    ? { backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }
                    : { backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }
                }
              >
                {isActive && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)' }}
                  />
                )}

                {/* Top row: client + status */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    {client?.brand_name ?? client?.name ?? 'Unknown client'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {isDraft && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
                      >
                        Draft
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }}
                      >
                        Active
                      </span>
                    )}
                    {p.segment && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }}
                      >
                        {SEGMENT_LABEL[p.segment]}
                      </span>
                    )}
                  </div>
                </div>

                <Link href={`/projects/${p.id}`} className="block">
                  <h3 className="text-lg font-bold leading-tight text-white transition-colors group-hover:text-[#D4AF37]">
                    {p.name}
                  </h3>
                </Link>

                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500">
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

                <p className="mt-4 font-mono text-[15px] font-semibold" style={{ color: '#D4AF37' }}>
                  {fmtPaiseRange(p.price_min_paise, p.price_max_paise)}
                </p>

                {/* Lead count stats */}
                <div
                  className="mt-5 grid grid-cols-2 gap-3 rounded-xl border p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Total Leads</p>
                    <p className="mt-1 font-mono text-xl font-semibold text-white">{c.total}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Qualified+</p>
                    <p
                      className={`mt-1 font-mono text-xl font-semibold ${c.qualified > 0 ? '' : 'text-gray-600'}`}
                      style={c.qualified > 0 ? { color: '#34d399' } : undefined}
                    >
                      {c.qualified}
                    </p>
                  </div>
                </div>

                {p.rera_number && (
                  <p
                    className="mt-3 inline-flex w-fit rounded-md border px-2 py-0.5 font-mono text-[10px] text-gray-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    RERA · {p.rera_number}
                  </p>
                )}

                {/* Footer buttons */}
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {isDraft ? (
                    <>
                      <p className="w-full text-[12px] text-gray-500">
                        Submitted by client — review and activate to go live.
                      </p>
                      <ActivateButton projectId={p.id} />
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex-1 rounded-xl border px-3 py-1.5 text-center text-[12px] font-semibold transition-colors"
                        style={{
                          borderColor: 'rgba(212,175,55,0.28)',
                          backgroundColor: 'rgba(212,175,55,0.10)',
                          color: '#D4AF37',
                        }}
                      >
                        View
                      </Link>
                      <Link
                        href={`/leads?project=${p.id}`}
                        className="flex-1 rounded-xl border px-3 py-1.5 text-center text-[12px] font-medium text-gray-400 transition-colors hover:text-white"
                        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                      >
                        Leads
                      </Link>
                      <Link
                        href={`/projects/${p.id}/creatives`}
                        className="flex-1 rounded-xl border px-3 py-1.5 text-center text-[12px] font-medium text-gray-400 transition-colors hover:text-white"
                        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                      >
                        Ads
                      </Link>
                      {p.public_slug && (
                        <a
                          href={`/p/${p.public_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-3 py-1.5 text-center text-[12px] font-semibold transition-colors"
                          style={{
                            borderColor: 'rgba(212,175,55,0.28)',
                            backgroundColor: 'rgba(212,175,55,0.10)',
                            color: '#D4AF37',
                          }}
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
