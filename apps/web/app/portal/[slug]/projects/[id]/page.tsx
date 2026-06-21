import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getProjectData(clientSlug: string, projectId: string) {
  const supabase = getSupabaseServer();

  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug')
    .eq('slug', clientSlug)
    .maybeSingle();

  let client = bySlug;
  if (!client && UUID_RE.test(clientSlug)) {
    const { data: byId } = await supabase
      .from('clients')
      .select('id, name, brand_name, slug')
      .eq('id', clientSlug)
      .maybeSingle();
    client = byId;
  }
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
      <header
        className="mb-10 border-b pb-8"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Link
            href={`/portal/${params.slug}/projects`}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition hover:text-gray-400"
          >
            Projects
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{project.name}</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">
          {project.name}
        </h1>
        <p className="mt-2 text-[14px] text-gray-500">{project.location}{project.unit_type ? ` · ${project.unit_type}` : ''}</p>
        {project.public_slug && (
          <Link
            href={`/p/${project.public_slug}`}
            target="_blank"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold transition"
            style={{ color: 'rgba(212,175,55,0.60)' }}
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
          { label: 'Cost per Lead', value: stats.cpl ? `₹${stats.cpl.toLocaleString('en-IN')}` : '—', sub: 'across all campaigns' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl border p-6"
            style={{ backgroundColor: '#090909', borderColor: 'rgba(212,175,55,0.15)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{s.label}</div>
            <div className="mt-3 font-mono text-3xl font-black" style={{ color: '#D4AF37' }}>
              {s.value}
            </div>
            <div className="mt-1 text-[12px] text-gray-600">{s.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Campaigns */}
        <section>
          <h2
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#D4AF37' }}
          >
            Active Campaigns
          </h2>
          {campaigns.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center text-[13px] text-gray-600"
              style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              No campaigns yet. Generate ad creatives from the internal dashboard.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{PLATFORM_ICON[c.platform] ?? '📣'}</span>
                      <span className="text-[14px] font-semibold text-white">{c.name}</span>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={
                        c.status === 'active'
                          ? { backgroundColor: 'rgba(34,197,94,0.12)', color: 'rgb(74,222,128)', border: '1px solid rgba(34,197,94,0.25)' }
                          : c.status === 'draft'
                          ? { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgb(107,114,128)', border: '1px solid rgba(255,255,255,0.08)' }
                          : { backgroundColor: 'rgba(234,179,8,0.12)', color: 'rgb(250,204,21)', border: '1px solid rgba(234,179,8,0.25)' }
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-[12px] text-gray-600">
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
          <h2
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#D4AF37' }}
          >
            Scheduled Posts
          </h2>
          {socialPosts.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center text-[13px] text-gray-600"
              style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              No posts scheduled. Generate content from the Social tab.
            </div>
          ) : (
            <div className="space-y-3">
              {socialPosts.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] text-white">{PLATFORM_ICON[p.platform] ?? '📱'} {p.platform}</span>
                    <span className="font-mono text-[11px] text-gray-600">
                      {new Date(p.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[12px] text-gray-500">{p.caption}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent leads */}
      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: '#D4AF37' }}
          >
            Recent Leads
          </h2>
          <Link
            href={`/portal/${params.slug}/leads`}
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-600 transition hover:text-gray-400"
          >
            View all →
          </Link>
        </div>
        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <tr>
                {['Name', 'Source', 'Status', 'Score'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {recentLeads.map((l: any) => (
                <tr
                  key={l.id}
                  className="border-t hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <td className="px-4 py-3 text-[14px] font-semibold text-white">{maskName(l.full_name)}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-600">{l.source}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgb(156,163,175)' }}
                    >
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono text-[14px] font-bold ${l.score >= 70 ? 'text-green-400' : l.score >= 40 ? 'text-yellow-400' : 'text-gray-600'}`}>
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
