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
      'id, project_id, platform, name, status, headline, primary_text, budget_paise_daily, leads_count, started_at, external_campaign_id, lead_form_id, projects(id, name)',
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
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={
        accent
          ? { backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }
          : { backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }
      }
    >
      {accent && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
          }}
        />
      )}
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</p>
      <p
        className="mt-2 font-mono text-3xl font-black"
        style={accent ? { color: '#D4AF37' } : { color: '#FFFFFF' }}
      >
        {value}
      </p>
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
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Campaigns
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">
            Ad Creatives
          </h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Claude-generated ad copy · Meta, Google &amp; 99acres
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Campaigns" value={String(stats.total)} accent />
        <StatCard label="Active Now" value={String(stats.active)} />
        <StatCard label="Total Leads Acquired" value={stats.totalLeads.toLocaleString('en-IN')} accent />
        <StatCard label="Avg Budget / Day" value={fmtBudget(stats.avgBudgetPaise)} />
      </div>

      <div
        className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: '#090909',
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
        <div
          className="rounded-2xl border border-dashed p-12 text-center"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
        >
          <p className="text-base font-bold text-white">No ad creatives yet</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-gray-500">
            Open a project and head to its{' '}
            <span style={{ color: '#D4AF37' }}>Creatives</span> page to generate ad copy with
            Claude — it&apos;ll show up here automatically.
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-[13px] font-bold transition hover:opacity-90"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            Go to Projects → Creatives
          </Link>
        </div>
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
