import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getProjectData(clientSlug: string, projectId: string) {
  const supabase = getSupabaseServer();

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug')
    .or(`slug.eq.${clientSlug},id.eq.${clientSlug}`)
    .maybeSingle();
  if (!client) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(name, brand_name)')
    .eq('id', projectId)
    .eq('client_id', client.id)
    .single();
  if (!project) return null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    { data: allLeads },
    { data: monthLeads },
    { data: campaigns },
    { data: socialPosts },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from('leads').select('id, status, score').eq('project_id', projectId),
    supabase.from('leads').select('id, status').eq('project_id', projectId).gte('created_at', monthStart.toISOString()),
    supabase.from('campaigns').select('id, name, platform, status, budget_paise_daily, leads_count, spend_paise, started_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
    supabase.from('social_posts').select('id, platform, caption, scheduled_at, status').eq('project_id', projectId).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(5),
    supabase.from('leads').select('id, full_name, status, score, source, last_contacted_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
  ]);

  type LeadRow = { id: string; status: string; score: number };
  const all: LeadRow[] = (allLeads ?? []) as LeadRow[];
  const month = (monthLeads ?? []) as { id: string; status: string }[];

  const qualified = all.filter(l => ['qualified', 'site_visit_booked', 'visited', 'negotiating', 'closed_won'].includes(l.status));
  const won = all.filter(l => l.status === 'closed_won');
  const qualRate = all.length ? Math.round((qualified.length / all.length) * 100) : 0;

  const totalSpend = ((campaigns ?? []) as any[]).reduce((s: number, c: any) => s + (c.spend_paise ?? 0), 0);
  const cpl = qualified.length && totalSpend ? Math.round(totalSpend / qualified.length / 100) : null;

  return {
    client,
    project,
    stats: {
      totalLeads: all.length,
      monthLeads: month.length,
      qualified: qualified.length,
      qualRate,
      siteVisits: all.filter(l => ['site_visit_booked', 'visited'].includes(l.status)).length,
      won: won.length,
      cpl,
    },
    campaigns: (campaigns ?? []) as any[],
    socialPosts: (socialPosts ?? []) as any[],
    recentLeads: (recentLeads ?? []) as any[],
  };
}

function fmtPaise(p: number) {
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(1)} Cr`;
  if (p >= 100_000) return `₹${(p / 100_000).toFixed(1)} L`;
  return `₹${p.toLocaleString('en-IN')}`;
}

function maskName(name: string) {
  return name.split(' ').map((p: string) => p.length > 2 ? `${p[0]}***` : p).join(' ');
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📷', facebook: '👥', linkedin: '💼', twitter: '🐦',
  meta: '📘', google: '🔍', '99acres': '🏠',
};

export default async function PortalProjectPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const data = await getProjectData(params.slug, params.id);
  if (!data) notFound();

  const { client, project, stats, campaigns, socialPosts, recentLeads } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <header className="mb-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/portal/${params.slug}/projects`} className="text-xs text-white/40 hover:text-[#d4af37]">
            Projects
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-xs text-white/60">{project.name}</span>
        </div>
        <h1 className="font-serif text-4xl font-bold text-[#d4af37]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          {project.name}
        </h1>
        <p className="mt-1 text-white/50">{project.location} · {project.unit_type}</p>
        {project.public_slug && (
          <Link
            href={`/p/${project.public_slug}`}
            target="_blank"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#d4af37]/60 hover:text-[#d4af37]"
          >
            View landing page →
          </Link>
        )}
      </header>

      {/* Stats grid */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Leads', value: String(stats.totalLeads), sub: `${stats.monthLeads} this month` },
          { label: 'Qualified', value: `${stats.qualified}`, sub: `${stats.qualRate}% qualify rate` },
          { label: 'Site Visits', value: String(stats.siteVisits), sub: `${stats.won} closed` },
          { label: 'Cost per Qualified Lead', value: stats.cpl ? `₹${stats.cpl.toLocaleString('en-IN')}` : '—', sub: 'across all campaigns' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#d4af37]/20 bg-white/[0.02] p-6">
            <div className="text-xs uppercase tracking-widest text-white/50">{s.label}</div>
            <div className="mt-2 font-serif text-4xl text-[#d4af37]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              {s.value}
            </div>
            <div className="mt-1 text-xs text-white/40">{s.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Campaigns */}
        <section>
          <h2 className="mb-4 text-sm uppercase tracking-widest text-[#d4af37]">Active Campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-white/40">
              No campaigns yet. Generate ad creatives from the internal dashboard.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{PLATFORM_ICON[c.platform] ?? '📣'}</span>
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active' ? 'bg-green-900/50 text-green-300' :
                      c.status === 'draft' ? 'bg-gray-800 text-gray-400' :
                      'bg-yellow-900/50 text-yellow-300'
                    }`}>{c.status}</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-white/40">
                    {c.budget_paise_daily && <span>₹{Math.round(c.budget_paise_daily / 100)}/day</span>}
                    <span>{c.leads_count ?? 0} leads</span>
                    {c.spend_paise > 0 && <span>{fmtPaise(c.spend_paise)} spent</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming social posts */}
        <section>
          <h2 className="mb-4 text-sm uppercase tracking-widest text-[#d4af37]">Scheduled Posts</h2>
          {socialPosts.length === 0 ? (
            <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-white/40">
              No posts scheduled. Generate content from the Social tab.
            </div>
          ) : (
            <div className="space-y-3">
              {socialPosts.map((p: any) => (
                <div key={p.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{PLATFORM_ICON[p.platform] ?? '📱'} {p.platform}</span>
                    <span className="text-xs text-white/40">
                      {new Date(p.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2">{p.caption}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent leads */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-widest text-[#d4af37]">Recent Leads</h2>
          <Link href={`/portal/${params.slug}/leads`} className="text-xs text-white/40 hover:text-[#d4af37]">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-white/50 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {recentLeads.map((l: any) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{maskName(l.full_name)}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{l.source}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono text-sm ${l.score >= 70 ? 'text-green-400' : l.score >= 40 ? 'text-yellow-400' : 'text-white/40'}`}>
                    {l.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
