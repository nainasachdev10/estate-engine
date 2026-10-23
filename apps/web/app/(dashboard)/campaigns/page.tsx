import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';
import { CampaignCard, type Campaign } from './campaign-card';
import { PageHeader, StatCard, EmptyState } from '../../components/ui';

export const dynamic = 'force-dynamic';

const PLATFORM_TABS = ['all', 'meta', 'google', '99acres'] as const;

async function getCampaigns(platform: string): Promise<Campaign[]> {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('campaigns')
    .select(
      'id, project_id, platform, name, status, headline, primary_text, budget_paise_daily, leads_count, started_at, external_campaign_id, lead_form_id, audience_preset, cpl_alert_paise, projects(id, name)',
    )
    .order('created_at', { ascending: false });
  if (platform && platform !== 'all') {
    q = q.eq('platform', platform);
  }
  const { data } = await q;
  return (data as unknown as Campaign[]) ?? [];
}

function computeStats(campaigns: Campaign[]) {
  const total = campaigns.length;
  const active = campaigns.filter((c) => c.status === 'active').length;
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads_count ?? 0), 0);
  const budgets = campaigns.map((c) => c.budget_paise_daily ?? 0).filter((b) => b > 0);
  const avgBudgetPaise =
    budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0;
  const platforms = new Set(campaigns.map((c) => c.platform));
  return { total, active, totalLeads, avgBudgetPaise, platformCount: platforms.size };
}

function fmtBudget(paise: number): string {
  if (!paise) return '—';
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)}L`;
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { platform?: string };
}) {
  const platform = searchParams.platform ?? 'all';
  // We fetch all campaigns for stats, then filter client-of-server for the grid
  // so the stat row reflects the whole account, not just the active tab.
  const all = await getCampaigns('all');
  const stats = computeStats(all);
  const visible = platform === 'all' ? all : all.filter((c) => c.platform === platform);

  return (
    <div className="p-6 md:p-8">
      <PageHeader eyebrow="Market · Campaigns" title="Ad Creatives"
        subtitle="Claude-generated ad copy with auto-stamped RERA · Meta, Google & 99acres. Meta launches carry an audience preset and a CPL guardrail." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Campaigns" value={String(stats.total)} accent />
        <StatCard label="Active Now" value={String(stats.active)} />
        <StatCard label="Total Leads Acquired" value={stats.totalLeads.toLocaleString('en-IN')} accent />
        <StatCard label="Avg Budget / Day" value={fmtBudget(stats.avgBudgetPaise)} />
      </div>

      <div
        className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: '#131315',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Platform
        </span>
        {PLATFORM_TABS.map((tab) => {
          const isActive = platform === tab;
          const href = tab === 'all' ? '/campaigns' : `/campaigns?platform=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold capitalize transition-colors ${
                isActive ? '' : 'text-gray-400 hover:text-white'
              }`}
              style={
                isActive
                  ? { backgroundColor: '#D4AF37', color: '#000' }
                  : {
                      border: '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                    }
              }
            >
              {tab}
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No ad creatives yet"
          body="Open a project and head to its Creatives page to generate ad copy with Claude — it'll show up here automatically, RERA number included."
          ctaHref="/projects"
          ctaLabel="Go to Projects → Creatives"
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
