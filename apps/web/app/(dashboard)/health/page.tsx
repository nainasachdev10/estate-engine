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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">System Health</h1>
        <p className="text-sm text-gray-400 mt-1">Last 24 hours · Auto-refreshes on load</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event counts */}
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-gold">Events · 24h</h2>
          <div className="rounded-lg border border-dark-tertiary overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-dark-secondary text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Kind</th>
                  <th className="px-4 py-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-tertiary">
                {sortedKinds.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                      No events in the last 24 hours.
                    </td>
                  </tr>
                ) : (
                  sortedKinds.map(([kind, count]) => (
                    <tr key={kind} className="hover:bg-dark-secondary">
                      <td className="px-4 py-2 font-mono text-xs text-gray-300">{kind}</td>
                      <td className="px-4 py-2 text-right font-mono">{count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending */}
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-gold">
            Stuck Leads · Should have been called
          </h2>
          <div className="rounded-lg border border-dark-tertiary overflow-hidden">
            {pending.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No stuck leads — every new lead has been picked up.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-dark-secondary text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Lead</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-tertiary">
                  {pending.map((l: any) => (
                    <tr key={l.id} className="hover:bg-dark-secondary">
                      <td className="px-4 py-2 font-mono text-xs">{maskPhone(l.phone_e164)}</td>
                      <td className="px-4 py-2 text-xs text-gray-300">{l.projects?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
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
        <h2 className="mb-3 text-xs uppercase tracking-widest text-gold">Recent Errors</h2>
        <div className="rounded-lg border border-dark-tertiary overflow-hidden">
          {errors.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No errors in recent history.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-dark-secondary text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Kind</th>
                  <th className="px-4 py-2 text-left">Payload</th>
                  <th className="px-4 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-tertiary">
                {errors.map((e: any) => (
                  <tr key={e.id} className="hover:bg-dark-secondary align-top">
                    <td className="px-4 py-2 font-mono text-xs text-red-300">{e.kind}</td>
                    <td className="px-4 py-2 text-xs text-gray-300">
                      <pre className="whitespace-pre-wrap font-mono text-[11px] max-w-md">
                        {JSON.stringify(e.payload, null, 2)?.slice(0, 200) ?? '—'}
                      </pre>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
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
