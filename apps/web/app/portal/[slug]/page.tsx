import { notFound } from 'next/navigation';
import {
  getClient,
  getProjects,
  getMonthLeadStats,
  getAllTimeFunnel,
  getSiteVisitsAllTime,
  getHotLeads,
  getDailyVolume,
  fmtPaise,
} from './portal-data';
import PortalStats from './portal-stats';
import { FunnelAndHotLeads, DailyVolumeSection } from './portal-sections';

export const dynamic = 'force-dynamic';

// TODO: Add magic-link auth — currently anyone with the slug can view.
// TODO: Enforce Supabase RLS so portal queries only return rows for this client_id.
// TODO: Real-time updates via Supabase subscriptions.

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
            {projects.length} active project{projects.length === 1 ? '' : 's'} · Monthly performance snapshot
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
      <PortalStats
        stats={[
          { label: 'New Leads · This Month', value: String(monthStats.leadsThisMonth) },
          {
            label: 'Qualified · This Month',
            value: String(monthStats.qualifiedThisMonth),
            hint: `${monthStats.qualifyRate}% qualify rate`,
          },
          { label: 'Site Visits · All-time', value: String(siteVisitsAllTime) },
          {
            label: 'Pipeline Value',
            value: fmtPaise(monthStats.pipelinePaise),
            hint: 'leads scored ≥60 × project price',
          },
        ]}
      />

      {/* Funnel + Hot leads */}
      <FunnelAndHotLeads funnel={funnel} hotLeads={hotLeads} slug={params.slug} />

      {/* Daily volume */}
      <DailyVolumeSection data={dailyVolume} />
    </div>
  );
}
