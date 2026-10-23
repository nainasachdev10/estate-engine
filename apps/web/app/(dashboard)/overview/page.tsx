import Link from 'next/link';
import { getSupabaseServer, formatINR } from '@realty-engine/core';
import { PageHeader, StatCard, Card, GOLD } from '../../components/ui';

export const dynamic = 'force-dynamic';

// ─── The operator's morning brief: one screen answering "what needs me now?" ──
// Everything on this page is a queue with a deep link — nothing is display-only.

const G = GOLD;

async function getOverview() {
  const supabase = getSupabaseServer();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const since24h = new Date(now - day).toISOString();
  const since7d = new Date(now - 7 * day).toISOString();
  const next7d = new Date(now + 7 * day).toISOString();

  const [
    { count: newLeads },
    { count: leads24h },
    { data: hotLeads },
    { data: escalations },
    { count: visitsNext7d },
    { data: weekBookings },
    { count: leads7d },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('leads')
      .select('id, full_name, score, horizon, status, next_best_action, projects(name)')
      .eq('horizon', 'hot')
      .eq('do_not_contact', false)
      .not('status', 'in', '("closed_won","closed_lost","unresponsive")')
      .order('score', { ascending: false })
      .limit(5),
    supabase.from('escalations')
      .select('id, kind, created_at, brief, leads(id, full_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .gte('visit_scheduled_at', new Date(now).toISOString())
      .lte('visit_scheduled_at', next7d),
    supabase.from('bookings')
      .select('agreement_value_rupees, buyer_name, created_at')
      .eq('status', 'active')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
  ]);

  // The proposal's contractual commitments (§08), measured on the last 7 days:
  // % of leads contacted, median time-to-first-touch, opt-outs enforced.
  const [{ data: slaLeads }, { count: optOuts }] = await Promise.all([
    supabase.from('leads')
      .select('created_at, last_contacted_at')
      .gte('created_at', since7d)
      .lt('created_at', new Date(now - 60 * 60 * 1000).toISOString()) // give the pipeline an hour before judging
      .limit(500),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('do_not_contact', true),
  ]);
  const cohort = (slaLeads ?? []) as Array<{ created_at: string; last_contacted_at: string | null }>;
  const contacted = cohort.filter((l) => l.last_contacted_at);
  const contactMinutes = contacted
    .map((l) => (new Date(l.last_contacted_at as string).getTime() - new Date(l.created_at).getTime()) / 60000)
    .filter((m) => m >= 0)
    .sort((a, b) => a - b);
  const medianContactMin = contactMinutes.length
    ? contactMinutes[Math.floor(contactMinutes.length / 2)]
    : null;

  return {
    sla: {
      cohortSize: cohort.length,
      contactedPct: cohort.length ? Math.round((contacted.length / cohort.length) * 100) : null,
      medianContactMin,
      optOuts: optOuts ?? 0,
    },
    newLeads: newLeads ?? 0,
    leads24h: leads24h ?? 0,
    hotLeads: (hotLeads ?? []) as any[],
    escalations: (escalations ?? []) as any[],
    visitsNext7d: visitsNext7d ?? 0,
    weekBookings: (weekBookings ?? []) as Array<{ agreement_value_rupees: number; buyer_name: string; created_at: string }>,
    leads7d: leads7d ?? 0,
  };
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

const ESC_LABEL: Record<string, { label: string; color: string }> = {
  discount: { label: 'Discount talk', color: '#eab308' },
  complaint: { label: 'Complaint', color: '#f87171' },
  penthouse: { label: 'Penthouse', color: G },
  uncertain: { label: 'Needs judgment', color: '#818cf8' },
};
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[13px] text-gray-600">{text}</p>;
}

export default async function OverviewPage() {
  const o = await getOverview();
  const weekBookingValue = o.weekBookings.reduce((s, b) => s + b.agreement_value_rupees, 0);

  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader eyebrow="Today" title="Morning Brief"
        subtitle={`${today} · everything that needs a human, on one screen`} />

      {/* The contractual commitments (§08 of the pitch), measured live */}
      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl border px-5 py-3.5"
        style={{ backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.18)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">The Commitments · 7d</span>
        <span className="text-[13px] text-gray-300">
          First touch: <strong className="font-mono" style={{ color: G }}>
            {o.sla.medianContactMin === null ? '—' : o.sla.medianContactMin < 60 ? `${Math.round(o.sla.medianContactMin)}m` : `${(o.sla.medianContactMin / 60).toFixed(1)}h`}
          </strong> median
        </span>
        <span className="text-[13px] text-gray-300">
          Contacted: <strong className="font-mono" style={{ color: o.sla.contactedPct !== null && o.sla.contactedPct < 100 ? '#f87171' : G }}>
            {o.sla.contactedPct === null ? '—' : `${o.sla.contactedPct}%`}
          </strong>{o.sla.cohortSize > 0 && <span className="text-gray-600"> of {o.sla.cohortSize}</span>}
        </span>
        <span className="text-[13px] text-gray-300">
          Opt-outs enforced: <strong className="font-mono" style={{ color: G }}>{o.sla.optOuts}</strong>
        </span>
        <Link href="/analytics" className="ml-auto text-[11px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80" style={{ color: G }}>
          Full analytics →
        </Link>
      </div>

      {/* Attention row — ordered by urgency, every tile is a link */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Handovers Open" value={String(o.escalations.length)} href="/operations" urgent={o.escalations.length > 0} />
        <StatCard label="Bookings · 7d" value={String(o.weekBookings.length)} href="/inventory" accent={o.weekBookings.length > 0} />
        <StatCard label="Hot — Call First" value={String(o.hotLeads.length)} href="/pipeline" accent />
        <StatCard label="New Leads" value={String(o.newLeads)} href="/leads?status=new" />
        <StatCard label="Visits Next 7d" value={String(o.visitsNext7d)} href="/pipeline" />
        <StatCard label="Leads (24h)" value={String(o.leads24h)} href="/leads" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Handover queue — the one list that can cost money if ignored */}
        <Card title="Needs a Human — Now" accent
          hint="Hard rules tripped these. The AI stopped replying; take over personally."
          viewAllHref="/operations" viewAllLabel="Handover queue">
          {o.escalations.length === 0 ? <Empty text="Nothing waiting. Discount, complaint and penthouse conversations land here the moment they happen." /> : (
            <ul className="space-y-2">
              {o.escalations.map((e) => {
                const lead = one<{ id: string; full_name: string }>(e.leads);
                const style = ESC_LABEL[e.kind] ?? ESC_LABEL.uncertain;
                return (
                  <li key={e.id}>
                    <Link href={lead ? `/leads/${lead.id}` : '/operations'}
                      className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all hover:border-[rgba(212,175,55,0.3)]"
                      style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex-none rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${style.color}22`, color: style.color }}>{style.label}</span>
                        <span className="truncate text-[13px] font-medium text-white">{lead?.full_name ?? 'Unknown lead'}</span>
                      </span>
                      <span className="flex-none font-mono text-[10px] text-gray-600">
                        {new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Bookings this week — the pipeline's actual output */}
        <Card title="Booked This Week"
          hint="Deals closed and recorded — unit blocked, channel partner credited."
          viewAllHref="/inventory" viewAllLabel="Inventory">
          {o.weekBookings.length === 0 ? <Empty text="No bookings yet this week. Closed-won leads prompt a one-click booking from their lead page." /> : (
            <ul className="space-y-2">
              {o.weekBookings.slice(0, 5).map((b, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <span className="truncate text-[13px] font-medium text-white">{b.buyer_name}</span>
                  <span className="flex-none font-mono text-[13px] font-bold" style={{ color: G }}>
                    ₹{(b.agreement_value_rupees / 1e7).toFixed(2)} Cr
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Hot list — who to call before 10am */}
        <Card title="Call These First"
          hint="Hot-horizon buyers, ranked by Buying Score, each with its next best action."
          viewAllHref="/pipeline" viewAllLabel="Intent board">
          {o.hotLeads.length === 0 ? <Empty text="No hot leads right now — scores re-rank nightly and on every touch." /> : (
            <ul className="space-y-2">
              {o.hotLeads.map((l) => {
                const project = one<{ name: string }>(l.projects);
                const nba = l.next_best_action ?? {};
                return (
                  <li key={l.id}>
                    <Link href={`/leads/${l.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all hover:border-[rgba(212,175,55,0.3)]"
                      style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex-none font-mono text-[15px] font-black" style={{ color: G }}>{l.score}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-white">{l.full_name}</span>
                          <span className="block truncate text-[11px] text-gray-500">
                            {project?.name ?? ''}{nba.action ? ` · ${String(nba.action).replace(/_/g, ' ')} via ${nba.channel ?? '—'}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="flex-none rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>hot</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Week velocity snapshot */}
        <Card title="This Week"
          hint="Velocity at a glance — the funnel's inputs and its output."
          viewAllHref="/analytics" viewAllLabel="Analytics">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Leads · 7d', value: String(o.leads7d) },
              { label: 'Visits · 7d', value: String(o.visitsNext7d) },
              { label: 'Booked Value · 7d', value: weekBookingValue > 0 ? formatINR(weekBookingValue) : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600">{s.label}</p>
                <p className="mt-0.5 truncate font-mono text-[15px] font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
