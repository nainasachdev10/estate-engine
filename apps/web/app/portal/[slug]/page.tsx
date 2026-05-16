import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';
import FunnelChart, { type FunnelDatum } from './components/funnel-chart';
import DailyVolumeChart, { type DailyVolumeDatum } from './components/daily-volume-chart';

export const dynamic = 'force-dynamic';

// TODO: Add magic-link auth — currently anyone with the slug can view.
// TODO: Enforce Supabase RLS so portal queries only return rows for this client_id.
// TODO: Real-time updates via Supabase subscriptions.

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit_booked'
  | 'visited'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'unresponsive';

const FUNNEL_ORDER: { stage: LeadStatus; label: string }[] = [
  { stage: 'new', label: 'New' },
  { stage: 'contacted', label: 'Contacted' },
  { stage: 'qualified', label: 'Qualified' },
  { stage: 'site_visit_booked', label: 'Site Visit' },
  { stage: 'visited', label: 'Visited' },
  { stage: 'negotiating', label: 'Negotiating' },
  { stage: 'closed_won', label: 'Won' },
];

type Client = {
  id: string;
  name: string;
  brand_name: string | null;
  slug: string | null;
  gold_color_hex: string | null;
  contact_email: string | null;
};

async function getClient(slug: string): Promise<Client | null> {
  const supabase = getSupabaseServer();
  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return bySlug as Client;
  const { data: byId } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('id', slug)
    .maybeSingle();
  return (byId as Client | null) ?? null;
}

async function getProjects(clientId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, price_min_paise')
    .eq('client_id', clientId);
  return (data ?? []) as Array<{ id: string; name: string; price_min_paise: number | null }>;
}

type LeadStatsRow = {
  id: string;
  project_id: string;
  status: LeadStatus;
  score: number;
  created_at: string;
};

async function getMonthLeadStats(clientId: string, projectIds: string[], priceMap: Map<string, number>) {
  if (projectIds.length === 0) {
    return {
      leadsThisMonth: 0,
      qualifiedThisMonth: 0,
      qualifyRate: 0,
      pipelinePaise: 0,
    };
  }
  const supabase = getSupabaseServer();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('leads')
    .select('id, project_id, status, score, created_at')
    .in('project_id', projectIds)
    .gte('created_at', monthStart.toISOString());

  const rows = (data ?? []) as LeadStatsRow[];
  const leadsThisMonth = rows.length;
  const qualifiedThisMonth = rows.filter((l) =>
    ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(l.status)
  ).length;
  const qualifyRate = leadsThisMonth === 0 ? 0 : Math.round((qualifiedThisMonth / leadsThisMonth) * 100);
  const pipelinePaise = rows
    .filter((l) => l.score >= 60)
    .reduce((sum, l) => sum + (priceMap.get(l.project_id) ?? 0), 0);

  return { leadsThisMonth, qualifiedThisMonth, qualifyRate, pipelinePaise };
}

async function getAllTimeFunnel(projectIds: string[]): Promise<FunnelDatum[]> {
  if (projectIds.length === 0) {
    return FUNNEL_ORDER.map((s) => ({ stage: s.stage, label: s.label, count: 0 }));
  }
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('leads').select('status').in('project_id', projectIds);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((l: { status: string }) => {
    counts[l.status] = (counts[l.status] ?? 0) + 1;
  });
  return FUNNEL_ORDER.map((s) => ({
    stage: s.stage,
    label: s.label,
    count: counts[s.stage] ?? 0,
  }));
}

async function getSiteVisitsAllTime(projectIds: string[]): Promise<number> {
  if (projectIds.length === 0) return 0;
  const supabase = getSupabaseServer();
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .in('status', ['site_visit_booked', 'visited', 'negotiating', 'closed_won']);
  return count ?? 0;
}

async function getHotLeads(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, score, status, last_contacted_at, projects(name)')
    .in('project_id', projectIds)
    .gte('score', 70)
    .not('status', 'in', '(closed_won,closed_lost,unresponsive)')
    .order('score', { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getDailyVolume(projectIds: string[]): Promise<DailyVolumeDatum[]> {
  // Build a 30-day rolling window of daily counts, IST-aware.
  const days = 30;
  const today = new Date();
  // Anchor "today" in IST
  const istNowMs = today.getTime() + (5.5 * 60 - today.getTimezoneOffset()) * 60_000;
  const istNow = new Date(istNowMs);
  const startDay = new Date(istNow);
  startDay.setUTCDate(istNow.getUTCDate() - (days - 1));
  startDay.setUTCHours(0, 0, 0, 0);

  // Fetch raw created_at — group in JS to handle IST date boundaries cleanly.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setUTCDate(startDay.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  if (projectIds.length > 0) {
    const supabase = getSupabaseServer();
    // Use UTC start ~36h earlier to be safe against tz drift, then re-bucket in IST.
    const fetchFrom = new Date(startDay.getTime() - 36 * 60 * 60 * 1000);
    const { data } = await supabase
      .from('leads')
      .select('created_at')
      .in('project_id', projectIds)
      .gte('created_at', fetchFrom.toISOString());

    (data ?? []).forEach((row: { created_at: string }) => {
      const istDate = new Date(
        new Date(row.created_at).getTime() + 5.5 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);
      if (buckets.has(istDate)) {
        buckets.set(istDate, (buckets.get(istDate) ?? 0) + 1);
      }
    });
  }

  return Array.from(buckets.entries()).map(([date, count]) => {
    const d = new Date(`${date}T00:00:00Z`);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return { date, label, count };
  });
}

function maskName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p.length > 2 ? `${p[0]}***` : p))
    .join(' ');
}

function fmtPaise(paise: number): string {
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(1)} Cr`;
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)} L`;
  return `₹${paise.toLocaleString('en-IN')}`;
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'border-blue-700/40 bg-blue-900/30 text-blue-300',
    contacted: 'border-yellow-700/40 bg-yellow-900/30 text-yellow-300',
    qualified: 'border-green-700/40 bg-green-900/30 text-green-300',
    site_visit_booked: 'border-purple-700/40 bg-purple-900/30 text-purple-300',
    visited: 'border-indigo-700/40 bg-indigo-900/30 text-indigo-300',
    negotiating: 'border-orange-700/40 bg-orange-900/30 text-orange-300',
    closed_won: 'border-emerald-700/40 bg-emerald-900/30 text-emerald-300',
    closed_lost: 'border-red-700/40 bg-red-900/30 text-red-300',
    unresponsive: 'border-white/10 bg-white/[0.04] text-white/40',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        colors[status] ?? 'border-white/10 bg-white/[0.04] text-white/40'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 85
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : score >= 70
      ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]'
      : 'border-white/15 bg-white/[0.04] text-white/60';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs ${cls}`}>
      {score}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] p-6 transition-all hover:border-[#d4af37]/30">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/0 to-transparent transition-all duration-500 group-hover:via-[#d4af37]/70" />
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{label}</div>
      <div
        className="mt-3 font-serif text-4xl text-[#d4af37]"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

export default async function PortalPage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const projects = await getProjects(client.id);
  const projectIds = projects.map((p) => p.id);
  const priceMap = new Map<string, number>();
  projects.forEach((p) => priceMap.set(p.id, p.price_min_paise ?? 0));

  const [monthStats, funnel, siteVisitsAllTime, hotLeads, dailyVolume] = await Promise.all([
    getMonthLeadStats(client.id, projectIds, priceMap),
    getAllTimeFunnel(projectIds),
    getSiteVisitsAllTime(projectIds),
    getHotLeads(projectIds),
    getDailyVolume(projectIds),
  ]);

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const updatedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Section header */}
      <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-[#d4af37]">
            Executive Overview
          </p>
          <h1
            className="font-serif text-4xl font-bold leading-tight text-[#d4af37] md:text-5xl"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {client.brand_name ?? client.name}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {projects.length} active project{projects.length === 1 ? '' : 's'} · Monthly
            performance snapshot
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-[11px] uppercase tracking-widest text-[#d4af37]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
            {monthLabel}
          </div>
          <p className="text-[11px] text-white/40">Last updated: {updatedAt} IST</p>
        </div>
      </header>

      {/* Hero stats */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New Leads · This Month" value={String(monthStats.leadsThisMonth)} />
        <StatCard
          label="Qualified · This Month"
          value={String(monthStats.qualifiedThisMonth)}
          hint={`${monthStats.qualifyRate}% qualify rate`}
        />
        <StatCard label="Site Visits · All-time" value={String(siteVisitsAllTime)} />
        <StatCard
          label="Pipeline Value"
          value={fmtPaise(monthStats.pipelinePaise)}
          hint="leads scored ≥60 × project price"
        />
      </section>

      {/* Funnel + Hot leads */}
      <section className="mb-10 grid gap-4 lg:grid-cols-12">
        {/* Funnel */}
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Funnel</p>
              <h2
                className="font-serif text-lg text-white"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Lead progression · all time
              </h2>
            </div>
          </div>
          <FunnelChart data={funnel} />
        </div>

        {/* Hot leads */}
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Hot leads</p>
              <h2
                className="font-serif text-lg text-white"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Score ≥ 70
              </h2>
            </div>
            <Link
              href={`/portal/${params.slug}/leads`}
              className="text-[11px] uppercase tracking-widest text-white/50 transition hover:text-[#d4af37]"
            >
              View all →
            </Link>
          </div>

          {hotLeads.length === 0 ? (
            <div className="rounded-lg border border-white/5 bg-[#0a0a0a] p-8 text-center text-sm text-white/40">
              No hot leads yet — they appear here as scores climb above 70.
            </div>
          ) : (
            <div className="-mx-2 max-h-[340px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/5">
                  {hotLeads.map((l: any) => {
                    const projectName = Array.isArray(l.projects)
                      ? l.projects[0]?.name
                      : l.projects?.name;
                    return (
                      <tr key={l.id} className="group">
                        <td className="px-2 py-2.5">
                          <Link
                            href={`/portal/${params.slug}/leads#${l.id}`}
                            className="block"
                          >
                            <div className="font-medium text-white transition group-hover:text-[#d4af37]">
                              {maskName(l.full_name)}
                            </div>
                            <div className="text-[11px] text-white/40">
                              {projectName ?? '—'}
                            </div>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <ScorePill score={l.score} />
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <StatusPill status={l.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Daily volume */}
      <section className="mb-10 rounded-xl border border-white/10 bg-[#0f0f0f] p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Lead velocity</p>
            <h2
              className="font-serif text-lg text-white"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Daily lead volume · last 30 days
            </h2>
          </div>
          <div className="text-right">
            <div
              className="font-serif text-2xl text-[#d4af37]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {dailyVolume.reduce((s, d) => s + d.count, 0)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">total · 30d</div>
          </div>
        </div>
        <DailyVolumeChart data={dailyVolume} />
      </section>
    </div>
  );
}
