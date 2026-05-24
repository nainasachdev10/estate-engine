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

export function FunnelSection({ rows, total }: { rows: FunnelRow[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card title="Lead Pipeline Funnel" subtitle={`${total.toLocaleString('en-IN')} total leads tracked`}>
      <div className="space-y-3">
        {rows.map((row, i) => {
          const prev = i > 0 ? rows[i - 1] : null;
          const stepConv =
            prev && prev.count > 0 ? Math.round((row.count / prev.count) * 100) : null;
          return (
            <div key={row.status}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium capitalize text-gray-200">{row.label}</span>
                <span className="text-gray-500">
                  <span className="font-mono text-gray-300">{row.count.toLocaleString('en-IN')}</span>
                  <span className="ml-2">{row.pct.toFixed(0)}% of total</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-7 flex-1 overflow-hidden rounded-md bg-dark-bg">
                  <div
                    className={`h-full rounded-md ${row.color} transition-all`}
                    style={{ width: `${max > 0 ? Math.max((row.count / max) * 100, row.count > 0 ? 4 : 0) : 0}%` }}
                  />
                </div>
                {stepConv !== null && (
                  <span className="w-24 flex-none text-right text-[11px] text-gray-500">
                    {stepConv}% <span className="text-gray-600">→ stage</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
        <p className="py-6 text-center text-sm text-gray-500">No leads in the last 30 days.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-dark-tertiary">
          <table className="w-full text-sm">
            <thead className="bg-dark-bg text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Source</th>
                <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                <th className="px-4 py-2.5 text-right font-medium">% of Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary">
              {rows.map((r) => (
                <tr key={r.source} className="transition-colors hover:bg-dark-bg/60">
                  <td className="px-4 py-2.5 capitalize text-gray-200">{r.source}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-300">{r.leads}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{r.pct.toFixed(0)}%</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono text-gold">{r.avgScore}</span>
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
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Outcome breakdown</p>
        {stats.outcomes.map((o) => (
          <div key={o.key} className="flex items-center justify-between text-sm">
            <span className="capitalize text-gray-300">{o.label}</span>
            <span className="font-mono text-gray-400">{o.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
