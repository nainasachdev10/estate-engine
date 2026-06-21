import { Card, StatTile, fmtDuration } from './analytics-primitives';
import type { FunnelRow, SourceRow, VoiceStats } from './analytics-primitives';

// Re-export so the page can import everything from one module.
export { MessagingSection, SocialSection } from './analytics-channels';
export type {
  FunnelRow,
  SourceRow,
  VoiceStats,
  ChannelRow,
  SocialPlatformRow,
} from './analytics-primitives';

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

export function FunnelSection({
  rows,
  entered,
  lost,
  unresponsive,
}: {
  rows: FunnelRow[];
  entered: number;
  lost: number;
  unresponsive: number;
}) {
  return (
    <Card
      title="Lead Pipeline Funnel"
      subtitle={`${entered.toLocaleString('en-IN')} leads entered the pipeline · cumulative reach per stage`}
    >
      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.status}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[0.16em] capitalize text-gray-300">
                {row.label}
              </span>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[15px] font-black text-white">
                  {row.reached.toLocaleString('en-IN')}
                </span>
                <span className="hidden text-[11px] font-medium text-gray-600 sm:inline">
                  {row.barPct.toFixed(0)}% reached
                </span>
                <span className="w-24 text-right font-mono text-[11px] font-bold" style={{ color: '#D4AF37' }}>
                  {row.stepPct !== null ? (
                    <>
                      {row.stepPct}%
                      <span className="ml-1 font-sans font-normal text-gray-600">from prev</span>
                    </>
                  ) : (
                    <span className="font-sans font-normal text-gray-600">entry</span>
                  )}
                </span>
              </div>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.max(row.barPct, row.reached > 0 ? 2 : 0)}%`,
                  backgroundColor: '#D4AF37',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {(lost > 0 || unresponsive > 0) && (
        <div
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 text-[12px] text-gray-500"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span className="font-bold uppercase tracking-[0.16em] text-gray-600">Exited</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Closed lost
            <span className="font-mono font-bold text-gray-300">{lost}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-500" /> Unresponsive
            <span className="font-mono font-bold text-gray-300">{unresponsive}</span>
          </span>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function SourceSection({ rows, total }: { rows: SourceRow[]; total: number }) {
  return (
    <Card title="Lead Sources" subtitle={`Last 30 days · ${total.toLocaleString('en-IN')} leads`}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-600">No leads in the last 30 days.</p>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <table className="w-full text-[14px]">
            <thead
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  Source
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  Leads
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  % of Total
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                  Avg Score
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.source}
                  className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={
                    idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : undefined
                  }
                >
                  <td className="px-5 py-4 capitalize text-gray-200">{r.source}</td>
                  <td className="px-5 py-4 text-right font-mono font-semibold text-white">
                    {r.leads}
                  </td>
                  <td className="px-5 py-4 text-right text-gray-500">{r.pct.toFixed(0)}%</td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className="font-mono font-bold"
                      style={{ color: '#D4AF37' }}
                    >
                      {r.avgScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export function VoiceSection({ stats }: { stats: VoiceStats }) {
  return (
    <Card title="AI Voice Performance" subtitle="Bolna outbound calls">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatTile label="Total Calls" value={stats.totalCalls.toLocaleString('en-IN')} />
        <StatTile label="Connected" value={`${stats.connectedPct}%`} />
        <StatTile label="Qualified" value={`${stats.qualifiedPct}%`} />
        <StatTile label="Avg Duration" value={fmtDuration(stats.avgDuration)} />
      </div>
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Outcome breakdown
        </p>
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {stats.outcomes.map((o, idx) => (
            <div
              key={o.key}
              className="flex items-center justify-between px-4 py-2.5 text-[13px]"
              style={
                idx > 0
                  ? { borderTop: '1px solid rgba(255,255,255,0.04)' }
                  : undefined
              }
            >
              <span className="capitalize text-gray-300">{o.label}</span>
              <span className="font-mono font-semibold text-gray-400">{o.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
