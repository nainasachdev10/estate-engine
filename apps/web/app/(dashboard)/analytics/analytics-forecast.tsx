import { getSupabaseServer, CLOSED_STATUSES } from '@realty-engine/core';

// Pipeline forecast & unit economics — turns the live pipeline into the
// numbers a developer actually budgets on: score-weighted pipeline value,
// expected closures at observed conversion, and revenue already attributed.

interface OpenLead {
  score: number;
  horizon: string | null;
  projects: { price_min_paise: number | null; price_max_paise: number | null } | { price_min_paise: number | null; price_max_paise: number | null }[] | null;
}

function ticket(l: OpenLead): number {
  const p = Array.isArray(l.projects) ? l.projects[0] : l.projects;
  const min = p?.price_min_paise ?? 0;
  const max = p?.price_max_paise ?? 0;
  if (min && max) return (min + max) / 2;
  return min || max || 0;
}

function fmtMoney(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(0)} L`;
  return v > 0 ? `₹${Math.round(v).toLocaleString('en-IN')}` : '₹0';
}

export default async function ForecastSection({
  closedWon,
  winRate,
}: {
  closedWon: number;
  winRate: number;
}) {
  const supabase = getSupabaseServer();
  const [{ data: open }, { data: won }] = await Promise.all([
    supabase
      .from('leads')
      .select('score, horizon, projects(price_min_paise, price_max_paise)')
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
      .eq('do_not_contact', false)
      .limit(1000),
    supabase
      .from('leads')
      .select('score, horizon, projects(price_min_paise, price_max_paise)')
      .eq('status', 'closed_won')
      .limit(500),
  ]);

  const openLeads = (open ?? []) as OpenLead[];
  const wonLeads = (won ?? []) as OpenLead[];

  const hot = openLeads.filter((l) => l.horizon === 'hot').length;
  const warm = openLeads.filter((l) => l.horizon === 'warm').length;
  const pipelineValue = openLeads.reduce((s, l) => s + (l.score / 100) * ticket(l), 0);
  const attributedRevenue = wonLeads.reduce((s, l) => s + ticket(l), 0);
  // Expected closures this quarter: hot leads at the observed win rate (or a
  // conservative 10% before any deal has closed).
  const effectiveWinRate = winRate > 0 ? winRate / 100 : 0.1;
  const expectedClosures = Math.round(hot * effectiveWinRate * 10) / 10;

  const cells = [
    { label: 'Open opportunities', value: String(openLeads.length), context: `${hot} hot · ${warm} warm` },
    { label: 'Pipeline value', value: fmtMoney(pipelineValue), context: 'score-weighted by project ticket' },
    { label: 'Expected closures / qtr', value: expectedClosures.toFixed(1), context: `hot × ${(effectiveWinRate * 100).toFixed(0)}% win rate` },
    { label: 'Revenue attributed', value: fmtMoney(attributedRevenue), context: `${closedWon} units closed to date` },
  ];

  return (
    <div
      className="rounded-2xl border p-6 lg:col-span-2"
      style={{ backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: '#D4AF37' }}>
        Forecast &amp; Unit Economics
      </h2>
      <p className="mb-5 text-[13px] text-gray-500">
        One closed unit pays for the whole engine — everything else here is a leading indicator of that number.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{c.label}</p>
            <p className="mt-2 font-mono text-2xl font-black text-white">{c.value}</p>
            <p className="mt-1 text-[12px] text-gray-500">{c.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
