import { getSupabaseServer } from '@realty-engine/core';
import EscalationsPanel from './escalations-panel';
import SignalsPanel from './signals-panel';
import { PageHeader, Card } from '../../components/ui';

export const dynamic = 'force-dynamic';

const VERDICT_COLOR: Record<string, string> = { keep: '#22c55e', discard: '#f87171', inconclusive: '#eab308' };

export default async function OperationsPage() {
  const supabase = getSupabaseServer();

  const [{ data: escalations }, { data: experiments }, { data: signals }] =
    await Promise.all([
      supabase.from('escalations')
        .select('id, kind, detail, brief, status, created_at, leads(full_name, id)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('experiments')
        .select('id, desk, hypothesis, metric, baseline, variant, verdict, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
      supabase.from('buyer_signals')
        .select('id, source, quote, url, segment, score, why, suggested_approach, status, created_at')
        .eq('status', 'new')
        .order('score', { ascending: false })
        .limit(25),
    ]);

  return (
    <div className="p-6 md:p-8">
      <PageHeader eyebrow="Back Office · Operations" title="Handovers, Signals & Insights"
        subtitle="The human-handover queue, the buyer-signal review pool, and the nightly insight log." />

      <div className="mb-6">
        <EscalationsPanel escalations={(escalations ?? []) as any} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Nightly insights — honest name: it mines real data and logs verdicts;
            adopting a winner is still the operator's call. */}
        <Card title="Nightly Insights"
          hint="Every night at 2:00 the system compares its own data — send times, campaign CPL, source quality — and logs what measurably worked. You decide what to adopt.">
          {(experiments ?? []).length === 0 ? (
            <p className="py-8 text-center text-[13px] text-gray-600">
              First entries appear once there is enough send/campaign data for a comparison to mean something.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left font-mono text-[12px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
                    <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Desk</th>
                    <th className="pb-2 pr-3">Hypothesis</th><th className="pb-2">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {(experiments ?? []).map((e: any) => (
                    <tr key={e.id} className="border-t align-top" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <td className="py-2 pr-3 text-gray-500">{new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td className="py-2 pr-3 capitalize text-gray-400">{e.desk}</td>
                      <td className="py-2 pr-3 text-gray-200">
                        {e.hypothesis}
                        {e.baseline != null && e.variant != null && (
                          <span className="text-gray-600"> ({e.baseline} → {e.variant})</span>
                        )}
                      </td>
                      <td className="py-2 font-bold uppercase" style={{ color: VERDICT_COLOR[e.verdict] ?? '#9CA3AF' }}>{e.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <SignalsPanel signals={(signals ?? []) as any} />
      </div>
    </div>
  );
}
