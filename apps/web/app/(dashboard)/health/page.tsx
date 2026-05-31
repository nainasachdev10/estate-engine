import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getEventCounts() {
  const supabase = getSupabaseServer();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('events')
    .select('kind')
    .gte('created_at', since);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((e: { kind: string }) => {
    counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  });
  return counts;
}

async function getPendingLeads() {
  const supabase = getSupabaseServer();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, created_at, projects(name)')
    .eq('status', 'new')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

async function getRecentErrors() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('events')
    .select('id, kind, payload, created_at')
    .or('kind.like.%error%,kind.like.%failed%')
    .order('created_at', { ascending: false })
    .limit(5);
  return data ?? [];
}

function maskPhone(phone: string): string {
  return phone.replace(/(\+91)(\d{4})(\d{4})/, '$1•••• $3');
}

export default async function HealthPage() {
  const [eventCounts, pending, errors] = await Promise.all([
    getEventCounts(),
    getPendingLeads(),
    getRecentErrors(),
  ]);

  const sortedKinds = Object.entries(eventCounts).sort(([, a], [, b]) => b - a);

  // Top-level service summary cards
  const totalEvents = Object.values(eventCounts).reduce((acc, n) => acc + n, 0);
  const pendingHealthy = pending.length === 0;
  const errorsHealthy = errors.length === 0;
  const eventsHealthy = totalEvents > 0;

  const summaryCards = [
    {
      name: 'Event Pipeline',
      healthy: eventsHealthy,
      status: eventsHealthy ? 'OK' : 'Idle',
      detail: `${totalEvents} events in last 24h`,
    },
    {
      name: 'Lead Processing',
      healthy: pendingHealthy,
      status: pendingHealthy ? 'OK' : 'Stuck',
      detail: pendingHealthy ? 'All leads picked up' : `${pending.length} stuck leads`,
    },
    {
      name: 'Error Rate',
      healthy: errorsHealthy,
      status: errorsHealthy ? 'OK' : 'Errors',
      detail: errorsHealthy ? 'No recent errors' : `${errors.length} recent errors`,
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>Admin</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">System Health</h1>
          <p className="mt-1 text-[14px] text-gray-500">Last 24 hours · Auto-refreshes on load</p>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((c) => (
          <div
            key={c.name}
            className="rounded-2xl border p-5"
            style={{
              backgroundColor: '#090909',
              borderColor: c.healthy ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 flex-none rounded-full"
                style={{ backgroundColor: c.healthy ? '#34d399' : '#f87171' }}
              />
              <p className="text-[14px] font-semibold text-white">{c.name}</p>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <p
                className="text-[18px] font-bold"
                style={{ color: c.healthy ? '#34d399' : '#f87171' }}
              >
                {c.status}
              </p>
              <p className="font-mono text-[12px] text-gray-500">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event counts */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: '#D4AF37' }}
            >
              Events · 24h
            </p>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <table className="w-full text-[13px]">
              <thead
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  <th className="px-5 py-3 text-left">Kind</th>
                  <th className="px-5 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {sortedKinds.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-center text-[13px] text-gray-500">
                      No events in the last 24 hours.
                    </td>
                  </tr>
                ) : (
                  sortedKinds.map(([kind, count]) => (
                    <tr
                      key={kind}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-5 py-3 font-mono text-[12px] text-gray-300">{kind}</td>
                      <td
                        className="px-5 py-3 text-right font-mono text-[13px] font-semibold"
                        style={{ color: '#D4AF37' }}
                      >
                        {count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: pending.length > 0 ? '#f87171' : '#D4AF37' }}
            >
              Stuck Leads · Should have been called
            </p>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: '#090909',
              borderColor: pending.length > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.07)',
            }}
          >
            {pending.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-gray-500">
                No stuck leads — every new lead has been picked up.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    <th className="px-5 py-3 text-left">Lead</th>
                    <th className="px-5 py-3 text-left">Project</th>
                    <th className="px-5 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((l: any) => (
                    <tr
                      key={l.id}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-5 py-3 font-mono text-[12px] text-gray-300">
                        {maskPhone(l.phone_e164)}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-gray-400">{l.projects?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-[12px] text-gray-600">
                        {new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Errors */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: errors.length > 0 ? '#f87171' : '#D4AF37' }}
          >
            Recent Errors
          </p>
          <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: '#090909',
            borderColor: errors.length > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.07)',
          }}
        >
          {errors.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-gray-500">No errors in recent history.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  <th className="px-5 py-3 text-left">Kind</th>
                  <th className="px-5 py-3 text-left">Payload</th>
                  <th className="px-5 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e: any) => (
                  <tr
                    key={e.id}
                    className="hover:bg-[rgba(255,255,255,0.02)] transition-colors align-top"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-5 py-3 font-mono text-[12px] text-red-400">{e.kind}</td>
                    <td className="px-5 py-3 text-[12px] text-gray-400">
                      <pre className="whitespace-pre-wrap font-mono text-[11px] max-w-md text-gray-500">
                        {JSON.stringify(e.payload, null, 2)?.slice(0, 200) ?? '—'}
                      </pre>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-gray-600 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
