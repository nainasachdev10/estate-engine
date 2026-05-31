import Link from 'next/link';
import FunnelChart, { type FunnelDatum } from './components/funnel-chart';
import DailyVolumeChart, { type DailyVolumeDatum } from './components/daily-volume-chart';

const STATUS_COLORS: Record<string, string> = {
  new: 'border-blue-700/40 bg-blue-900/30 text-blue-300',
  contacted: 'border-yellow-700/40 bg-yellow-900/30 text-yellow-300',
  qualified: 'border-green-700/40 bg-green-900/30 text-green-300',
  site_visit_booked: 'border-purple-700/40 bg-purple-900/30 text-purple-300',
  visited: 'border-indigo-700/40 bg-indigo-900/30 text-indigo-300',
  negotiating: 'border-orange-700/40 bg-orange-900/30 text-orange-300',
  closed_won: 'border-emerald-700/40 bg-emerald-900/30 text-emerald-300',
  closed_lost: 'border-red-700/40 bg-red-900/30 text-red-300',
  unresponsive: 'border-white/10 bg-white/[0.04] text-white/40',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        STATUS_COLORS[status] ?? 'border-white/10 bg-white/[0.04] text-white/40'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 85
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : score >= 70
      ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]'
      : 'border-white/15 bg-white/[0.04] text-white/60';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs ${cls}`}>
      {score}
    </span>
  );
}

function maskName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p.length > 2 ? `${p[0]}***` : p))
    .join(' ');
}

type HotLead = {
  id: string;
  full_name: string;
  score: number;
  status: string;
  projects?: { name: string } | { name: string }[] | null;
};

export function FunnelAndHotLeads({
  funnel,
  hotLeads,
  slug,
}: {
  funnel: FunnelDatum[];
  hotLeads: HotLead[];
  slug: string;
}) {
  const totalLeads = funnel.reduce((s, f) => s + f.count, 0);

  return (
    <section className="mb-10 grid gap-4 lg:grid-cols-12">
      {/* Funnel */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 lg:col-span-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Lead Funnel</p>
            <h2
              className="font-serif text-lg text-white"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Progression · all time
            </h2>
          </div>
          <div className="text-right">
            <p
              className="font-serif text-2xl text-[#d4af37]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {totalLeads}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">total leads</p>
          </div>
        </div>
        <FunnelChart data={funnel} />
      </div>

      {/* Hot leads */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 lg:col-span-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Hot leads</p>
            <h2
              className="font-serif text-lg text-white"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Score ≥ 70
            </h2>
          </div>
          <Link
            href={`/portal/${slug}/leads`}
            className="text-[11px] uppercase tracking-widest text-white/50 transition hover:text-[#d4af37]"
          >
            View all →
          </Link>
        </div>

        {hotLeads.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-[#0a0a0a] p-8 text-center text-sm text-white/40">
            No hot leads yet — they appear here as scores climb above 70.
          </div>
        ) : (
          <div className="-mx-2 max-h-[340px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {hotLeads.map((l) => {
                  const projectName = Array.isArray(l.projects)
                    ? l.projects[0]?.name
                    : l.projects?.name;
                  return (
                    <tr key={l.id} className="group">
                      <td className="px-2 py-2.5">
                        <Link href={`/portal/${slug}/leads#${l.id}`} className="block">
                          <div className="font-medium text-white transition group-hover:text-[#d4af37]">
                            {maskName(l.full_name)}
                          </div>
                          <div className="text-[11px] text-white/40">{projectName ?? '—'}</div>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <ScorePill score={l.score} />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <StatusPill status={l.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function DailyVolumeSection({ data }: { data: DailyVolumeDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <section className="mb-10 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">Lead velocity</p>
          <h2
            className="font-serif text-lg text-white"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Daily lead volume · last 30 days
          </h2>
        </div>
        <div className="text-right">
          <div
            className="font-serif text-2xl text-[#d4af37]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {total}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">total · 30d</div>
        </div>
      </div>
      <DailyVolumeChart data={data} />
    </section>
  );
}
