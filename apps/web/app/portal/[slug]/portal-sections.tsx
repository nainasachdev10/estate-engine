import Link from 'next/link';
import FunnelChart, { type FunnelDatum } from './components/funnel-chart';
import DailyVolumeChart, { type DailyVolumeDatum } from './components/daily-volume-chart';

const STATUS_COLORS: Record<string, string> = {
  new: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  contacted: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  qualified: 'border-green-500/30 bg-green-500/10 text-green-300',
  site_visit_booked: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  visited: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  negotiating: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  closed_won: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  closed_lost: 'border-red-500/30 bg-red-500/10 text-red-300',
  unresponsive: 'border-white/10 bg-white/[0.04] text-gray-500',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
        STATUS_COLORS[status] ?? 'border-white/10 bg-white/[0.04] text-gray-500'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300">
        {score}
      </span>
    );
  }
  if (score >= 65) {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold"
        style={{
          borderColor: 'rgba(212,175,55,0.18)',
          backgroundColor: 'rgba(212,175,55,0.10)',
          color: '#D4AF37',
        }}
      >
        {score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-mono text-xs font-bold text-gray-500">
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
    <section className="mb-12 grid gap-4 lg:grid-cols-12">
      {/* Funnel */}
      <div
        className="rounded-2xl border p-6 lg:col-span-7"
        style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="mb-6 flex items-end justify-between border-b pb-5"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: '#D4AF37' }}
            >
              Lead Funnel
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white">
              Progression · all time
            </h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-black text-white">{totalLeads}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
              Total leads
            </p>
          </div>
        </div>
        <FunnelChart data={funnel} />
      </div>

      {/* Hot leads */}
      <div
        className="rounded-2xl border p-6 lg:col-span-5"
        style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="mb-5 flex items-end justify-between border-b pb-5"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: '#D4AF37' }}
            >
              Hot leads
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white">
              Score ≥ 70
            </h2>
          </div>
          <Link
            href={`/portal/${slug}/leads`}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 transition hover:text-[#D4AF37]"
          >
            View all →
          </Link>
        </div>

        {hotLeads.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center text-[13px] text-gray-500 leading-relaxed"
            style={{
              borderColor: 'rgba(255,255,255,0.07)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }}
          >
            No hot leads yet — they appear here as scores climb above 70.
          </div>
        ) : (
          <div className="-mx-2 max-h-[340px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {hotLeads.map((l) => {
                  const projectName = Array.isArray(l.projects)
                    ? l.projects[0]?.name
                    : l.projects?.name;
                  return (
                    <tr
                      key={l.id}
                      className="group border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <td className="px-2 py-3">
                        <Link href={`/portal/${slug}/leads#${l.id}`} className="block">
                          <div className="text-[14px] font-semibold text-white transition group-hover:text-[#D4AF37]">
                            {maskName(l.full_name)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-600">
                            {projectName ?? '—'}
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <ScorePill score={l.score} />
                      </td>
                      <td className="px-2 py-3 text-right">
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
    <section
      className="mb-12 rounded-2xl border p-6"
      style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div
        className="mb-6 flex items-end justify-between border-b pb-5"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Lead velocity
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white">
            Daily lead volume · last 30 days
          </h2>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-black text-white">{total}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
            Total · 30d
          </div>
        </div>
      </div>
      <DailyVolumeChart data={data} />
    </section>
  );
}
