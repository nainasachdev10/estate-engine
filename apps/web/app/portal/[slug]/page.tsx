import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

// TODO: Add magic-link auth (Supabase Auth) — currently anyone with the slug can view.
// TODO: Enforce Supabase RLS so portal queries only return rows for this client_id.
// TODO: Real-time updates via Supabase subscriptions.

async function getClient(slug: string) {
  const supabase = getSupabaseServer();
  // Allow either slug column or id (fallback for demo)
  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return bySlug;
  const { data: byId } = await supabase
    .from('clients')
    .select('id, name, brand_name, gold_color_hex, contact_email, slug')
    .eq('id', slug)
    .maybeSingle();
  return byId;
}

async function getProjects(clientId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, price_min_paise')
    .eq('client_id', clientId);
  return data ?? [];
}

async function getLeadStats(clientId: string) {
  const supabase = getSupabaseServer();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: projects } = await supabase.from('projects').select('id, price_min_paise').eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return null;

  const priceMap = new Map<string, number>();
  (projects ?? []).forEach((p: { id: string; price_min_paise: number | null }) => priceMap.set(p.id, p.price_min_paise ?? 0));

  const { data: monthLeads } = await supabase
    .from('leads')
    .select('id, project_id, status, score, last_contacted_at')
    .in('project_id', projectIds)
    .gte('created_at', monthStart.toISOString());

  type LeadRow = { id: string; project_id: string; status: string; score: number; last_contacted_at: string | null };
  const all: LeadRow[] = (monthLeads ?? []) as LeadRow[];
  const leadsThisMonth = all.length;
  const qualifiedThisMonth = all.filter((l) =>
    ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(l.status)
  ).length;
  const siteVisitsThisMonth = all.filter((l) =>
    ['site_visit_booked', 'visited'].includes(l.status)
  ).length;

  // Pipeline: leads with score>=60 × price_min of their project
  const pipelinePaise = all
    .filter((l) => l.score >= 60)
    .reduce((sum, l) => sum + (priceMap.get(l.project_id) ?? 0), 0);

  // Funnel: count per status across all-time
  const { data: allTime } = await supabase
    .from('leads')
    .select('status')
    .in('project_id', projectIds);
  const funnel: Record<string, number> = {};
  (allTime ?? []).forEach((l: { status: string }) => {
    funnel[l.status] = (funnel[l.status] ?? 0) + 1;
  });

  return {
    leadsThisMonth,
    qualifiedThisMonth,
    siteVisitsThisMonth,
    pipelinePaise,
    funnel,
  };
}

async function getHotLeads(clientId: string) {
  const supabase = getSupabaseServer();
  const { data: projects } = await supabase.from('projects').select('id').eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return [];

  const { data } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, score, status, last_contacted_at, projects(name)')
    .in('project_id', projectIds)
    .gte('score', 70)
    .not('status', 'in', '(closed_won,closed_lost,unresponsive)')
    .order('score', { ascending: false })
    .limit(20);

  return data ?? [];
}

function maskName(name: string): string {
  return name.split(' ').map((p) => (p.length > 2 ? `${p[0]}***` : p)).join(' ');
}

function fmtPaise(paise: number): string {
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(1)} Cr`;
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)} L`;
  return `₹${paise.toLocaleString('en-IN')}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-900 text-blue-300',
    contacted: 'bg-yellow-900 text-yellow-300',
    qualified: 'bg-green-900 text-green-300',
    site_visit_booked: 'bg-purple-900 text-purple-300',
    visited: 'bg-indigo-900 text-indigo-300',
    negotiating: 'bg-orange-900 text-orange-300',
    closed_won: 'bg-emerald-900 text-emerald-300',
    closed_lost: 'bg-red-900 text-red-300',
    unresponsive: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function PortalPage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const [stats, hotLeads, projects] = await Promise.all([
    getLeadStats(client.id),
    getHotLeads(client.id),
    getProjects(client.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <header className="mb-12 border-b border-white/10 pb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#d4af37]">Realty Engine · Client Portal</p>
        <h1
          className="font-serif text-4xl font-bold text-[#d4af37]"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {client.brand_name ?? client.name}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {projects.length} active project{projects.length === 1 ? '' : 's'} · Monthly performance overview
        </p>
      </header>

      {/* Hero stats */}
      <section className="mb-12 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Leads This Month"
          value={String(stats?.leadsThisMonth ?? 0)}
        />
        <StatCard
          label="Qualified This Month"
          value={String(stats?.qualifiedThisMonth ?? 0)}
        />
        <StatCard
          label="Site Visits Booked"
          value={String(stats?.siteVisitsThisMonth ?? 0)}
        />
        <StatCard
          label="Pipeline Value"
          value={fmtPaise(stats?.pipelinePaise ?? 0)}
          hint="leads scored ≥60 × project price"
        />
      </section>

      {/* Funnel */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm uppercase tracking-widest text-[#d4af37]">Funnel · All Time</h2>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
          {Object.entries(stats?.funnel ?? {}).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase text-white/50">{status.replace(/_/g, ' ')}</div>
              <div className="mt-1 font-mono text-2xl text-white">{count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Hot leads */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-[#d4af37]">Hot Leads · Score ≥ 70</h2>
          <Link
            href={`/portal/${params.slug}/leads`}
            className="text-xs text-white/60 hover:text-[#d4af37]"
          >
            View all →
          </Link>
        </div>

        {hotLeads.length === 0 ? (
          <div className="rounded-lg border border-white/10 p-8 text-center text-sm text-white/50">
            No hot leads yet — they will appear here as soon as scores climb above 70.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Last Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {hotLeads.map((l: any) => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{maskName(l.full_name)}</td>
                    <td className="px-4 py-3 text-white/70">{l.projects?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-green-400">{l.score}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {l.last_contacted_at
                        ? new Date(l.last_contacted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-white/40">
        Powered by Realty Engine · Updated every page load
      </footer>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#d4af37]/30 bg-gradient-to-br from-white/[0.04] to-transparent p-6">
      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
      <div
        className="mt-2 font-serif text-4xl text-[#d4af37]"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] text-white/40">{hint}</div>}
    </div>
  );
}
