import { Flame, Target, Lightbulb } from 'lucide-react';

export interface ScoreComponentRow {
  component: string;
  points: number;
  max: number;
  note: string;
}

export interface TriggerRow {
  id: string;
  trigger: string;
  evidence: string | null;
  confidence: number | null;
  source: string;
  created_at: string;
}

export interface NextBestActionData {
  action: string;
  channel: string;
  best_time_ist: string;
  opening_line: string;
  reason: string;
  generated_at?: string;
}

const HORIZON_STYLE: Record<string, { backgroundColor: string; color: string; label: string }> = {
  hot: { backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'HOT · contact now' },
  warm: { backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'WARM · nurture + invite' },
  cool: { backgroundColor: 'rgba(96,165,250,0.10)', color: '#93c5fd', label: 'COOL · monitor for trigger' },
};

const CARD = { backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' } as const;

const ACTION_COLOR: Record<string, string> = {
  contact: '#4ade80',
  nurture: '#fbbf24',
  wait: '#93c5fd',
  drop: '#f87171',
};

export default function IntelligencePanel({
  score,
  confidence,
  horizon,
  breakdown,
  triggers,
  nba,
  doNotContact,
}: {
  score: number;
  confidence: number | null;
  horizon: string | null;
  breakdown: ScoreComponentRow[] | null;
  triggers: TriggerRow[];
  nba: NextBestActionData | null;
  doNotContact: boolean;
}) {
  const horizonStyle = horizon ? HORIZON_STYLE[horizon] : null;

  return (
    <div className="space-y-4">
      {doNotContact && (
        <div
          className="rounded-2xl border p-4 text-[13px] font-bold"
          style={{ backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)', color: '#f87171' }}
        >
          OPTED OUT — all automated contact is blocked for this lead.
        </div>
      )}

      {/* Buying score build-up */}
      <div className="rounded-2xl border p-5" style={CARD}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            <Target className="h-3 w-3" /> Buying Score
          </h3>
          {horizonStyle && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={horizonStyle}>
              {horizonStyle.label}
            </span>
          )}
        </div>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-black" style={{ color: '#D4AF37' }}>{score}</span>
          <span className="text-[12px] text-gray-600">/ 100 · {confidence ?? 0}% data confidence</span>
        </div>
        {breakdown && breakdown.length > 0 ? (
          <div className="space-y-2.5">
            {breakdown.map((c) => (
              <div key={c.component}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">{c.component}</span>
                  <span className="font-mono text-gray-500">{c.points}/{c.max}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.max ? Math.round((c.points / c.max) * 100) : 0}%`,
                      backgroundColor: c.points / Math.max(c.max, 1) >= 0.66 ? '#D4AF37' : c.points > 0 ? '#8a7327' : 'transparent',
                    }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-gray-600">{c.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-gray-600">Breakdown appears after the first call or reply is scored.</p>
        )}
      </div>

      {/* Next best action */}
      {nba && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            <Lightbulb className="h-3 w-3" /> Next Best Action
          </h3>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: ACTION_COLOR[nba.action] ?? '#e5e7eb' }}>
              {nba.action}
            </span>
            <span className="capitalize text-gray-400">via {nba.channel}</span>
            <span className="text-gray-600">· {nba.best_time_ist} IST</span>
          </div>
          <p className="rounded-xl border px-3 py-2.5 text-[13px] italic leading-relaxed text-gray-200" style={{ backgroundColor: 'rgba(212,175,55,0.04)', borderColor: 'rgba(212,175,55,0.15)' }}>
            “{nba.opening_line}”
          </p>
          <p className="mt-2 text-[11px] text-gray-600">{nba.reason}</p>
        </div>
      )}

      {/* Why-now triggers */}
      {triggers.length > 0 && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            <Flame className="h-3 w-3" /> Why Now
          </h3>
          <div className="space-y-3">
            {triggers.map((t) => (
              <div key={t.id} className="rounded-xl border p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[13px] font-semibold text-gray-100">{t.trigger}</p>
                {t.evidence && <p className="mt-1 text-[11px] italic text-gray-500">“{t.evidence}”</p>}
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-gray-600">
                  {t.source.replace(/_/g, ' ')}{t.confidence != null ? ` · ${t.confidence}% confidence` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
