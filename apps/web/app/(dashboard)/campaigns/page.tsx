import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';
import { CampaignCard, type Campaign } from './campaign-card';

export const dynamic = 'force-dynamic';

const PLATFORM_TABS = ['all', 'meta', 'google', '99acres'] as const;

async function getCampaigns(platform: string): Promise<Campaign[]> {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('campaigns')
    .select(
      'id, project_id, platform, name, status, headline, primary_text, budget_paise_daily, leads_count, started_at, external_campaign_id, projects(id, name)',
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

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-dark-tertiary bg-dark-secondary p-5">
      <p className={`text-3xl font-bold ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500">{label}</p>
    </div>
  );
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Ad Engine</h1>
        <p className="mt-1 text-sm text-gray-400">
          Claude-generated copy · Meta, Google &amp; 99acres
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Campaigns" value={String(stats.total)} accent />
        <StatCard label="Active Now" value={String(stats.active)} />
        <StatCard label="Total Leads Acquired" value={stats.totalLeads.toLocaleString('en-IN')} accent />
        <StatCard label="Avg Budget / Day" value={fmtBudget(stats.avgBudgetPaise)} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {PLATFORM_TABS.map((tab) => {
          const isActive = platform === tab;
          const href = tab === 'all' ? '/campaigns' : `/campaigns?platform=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                isActive
                  ? 'bg-gold text-dark-bg'
                  : 'border border-dark-tertiary bg-dark-secondary text-gray-300 hover:border-gold/40'
              }`}
            >
              {tab}
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dark-tertiary p-14 text-center">
          <p className="text-base font-medium text-gray-300">No ad creatives yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Open a project and head to its{' '}
            <span className="text-gold">Creatives</span> page to generate ad copy with Claude —
            it&apos;ll show up here automatically.
          </p>
          <Link
            href="/projects"
            className="mt-5 inline-flex rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-dark-bg transition hover:opacity-90"
          >
            Go to Projects → Creatives
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
