import Link from 'next/link';
import { Flame, PhoneCall } from 'lucide-react';
import { getSupabaseServer, CLOSED_STATUSES } from '@realty-engine/core';

// "Who do I call today?" — the operator's intent board. Hot/warm split,
// score-weighted pipeline value, and the ranked call queue with each lead's
// recommended action. Data refreshes with the page (nightly rescore re-ranks).

interface BoardLead {
  id: string;
  full_name: string;
  score: number;
  horizon: string | null;
  status: string;
  next_best_action: { action?: string; channel?: string; opening_line?: string } | null;
  projects: { name: string; price_min_paise: number | null; price_max_paise: number | null } | { name: string; price_min_paise: number | null; price_max_paise: number | null }[] | null;
}

function proj(l: BoardLead) {
  return Array.isArray(l.projects) ? l.projects[0] : l.projects;
}

function avgTicket(l: BoardLead): number {
  const p = proj(l);
  const min = p?.price_min_paise ?? 0;
  const max = p?.price_max_paise ?? 0;
  if (min && max) return (min + max) / 2;
  return min || max || 0;
}

function fmtCr(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)} L`;
  return v > 0 ? `₹${Math.round(v).toLocaleString('en-IN')}` : '—';
}

const CARD = { backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.18)' } as const;

export default async function IntentBoard() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, score, horizon, status, next_best_action, projects(name, price_min_paise, price_max_paise)')
    .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
    .eq('do_not_contact', false)
    .order('score', { ascending: false })
    .limit(300);

  const leads = (data ?? []) as BoardLead[];
  if (leads.length === 0) return null;

  const hot = leads.filter((l) => l.horizon === 'hot');
  const warm = leads.filter((l) => l.horizon === 'warm');
  const pipelineValue = leads.reduce((sum, l) => sum + (l.score / 100) * avgTicket(l), 0);
  const queue = [...hot, ...warm].slice(0, 6);

  return (
    <div className="mb-8 rounded-2xl border p-5" style={CARD}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: '#D4AF37' }}>
          <PhoneCall className="h-3.5 w-3.5" /> Who do I call today?
        </h2>
        <div className="flex items-center gap-4 font-mono text-[12px]">
          <span style={{ color: '#f87171' }}>🔥 {hot.length} hot</span>
          <span style={{ color: '#fbbf24' }}>{warm.length} warm</span>
          <span className="text-gray-400">
            Pipeline <span className="font-bold text-white">{fmtCr(pipelineValue)}</span>
            <span className="text-gray-600"> (score-weighted)</span>
          </span>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="text-[13px] text-gray-500">
          No hot or warm leads yet — scores band into HOT/WARM/COOL as calls and replies come in.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {queue.map((l) => {
            const nba = l.next_best_action;
            return (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-[rgba(212,175,55,0.4)]"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {l.horizon === 'hot' && <Flame className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold text-white group-hover:text-[#D4AF37]">{l.full_name}</span>
                    <span className="truncate text-[11px] text-gray-600">{proj(l)?.name ?? ''}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full" style={{ width: `${l.score}%`, backgroundColor: l.horizon === 'hot' ? '#f87171' : '#D4AF37' }} />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-gray-300">{l.score}</span>
                    {nba?.action && (
                      <span className="truncate text-[11px] uppercase tracking-wide text-gray-500">
                        {nba.action}{nba.channel ? ` · ${nba.channel}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
