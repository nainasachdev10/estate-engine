import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

type CampaignRow = {
  id: string;
  project_id: string;
  platform: string;
  name: string;
  status: string;
  budget_paise_daily: number | null;
  leads_count: number;
  started_at: string | null;
  projects: { id: string; name: string } | null;
};

async function getCampaigns(filter: string): Promise<CampaignRow[]> {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('campaigns')
    .select('id, project_id, platform, name, status, budget_paise_daily, leads_count, started_at, projects(id, name)')
    .order('created_at', { ascending: false });
  if (filter && filter !== 'all') {
    q = q.eq('status', filter);
  }
  const { data } = await q;
  return (data as unknown as CampaignRow[]) ?? [];
}

function fmtRupees(paise: number | null): string {
  if (!paise) return '—';
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(1)} Cr/day`;
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)} L/day`;
  return `₹${(paise / 100).toLocaleString('en-IN')}/day`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-800 text-gray-400',
    active: 'bg-green-900 text-green-300',
    paused: 'bg-yellow-900 text-yellow-300',
    ended: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, string> = {
    meta: 'bg-blue-900 text-blue-300',
    google: 'bg-yellow-900 text-yellow-300',
    '99acres': 'bg-purple-900 text-purple-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[platform] ?? 'bg-gray-800 text-gray-400'}`}>
      {platform}
    </span>
  );
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter = searchParams.status ?? 'all';
  const campaigns = await getCampaigns(filter);

  const filters = ['all', 'draft', 'active', 'ended'];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gold">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-1">All ad creatives + paid campaigns across projects</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/campaigns' : `/campaigns?status=${f}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f
                ? 'bg-gold text-dark-bg'
                : 'bg-dark-secondary text-gray-300 border border-dark-tertiary hover:border-gold/40'
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center">
          <p className="text-gray-400">No campaigns {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
          <p className="text-sm text-gray-500 mt-1">
            Generate creatives from a project&apos;s <code className="text-gold">Creatives</code> page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dark-tertiary">
          <table className="w-full text-sm">
            <thead className="bg-dark-secondary text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Daily Budget</th>
                <th className="px-4 py-3 text-left">Leads</th>
                <th className="px-4 py-3 text-left">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-dark-secondary transition-colors">
                  <td className="px-4 py-3">
                    {c.projects ? (
                      <Link
                        href={`/projects/${c.projects.id}/creatives`}
                        className="text-gold hover:underline"
                      >
                        {c.projects.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><PlatformBadge platform={c.platform} /></td>
                  <td className="px-4 py-3 text-gray-300">{c.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmtRupees(c.budget_paise_daily)}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{c.leads_count ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.started_at
                      ? new Date(c.started_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
