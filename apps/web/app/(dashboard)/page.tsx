import { getSupabaseServer } from '@realty-engine/core';
import PipelineTable, { type PipelineLead } from './pipeline-table';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Stats {
  todaysLeads: number;
  qualifiedToday: number;
  callsToday: number;
  avgScoreWeek: number;
}

function startOfDayIST(): string {
  // Convert "today 00:00 IST" into an ISO string for Postgres timestamptz comparison
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const istMidnight = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0),
  );
  // Subtract IST offset to get the corresponding UTC instant
  return new Date(istMidnight.getTime() - istOffsetMs).toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

async function getStats(): Promise<Stats> {
  try {
    const supabase = getSupabaseServer();
    const todayStart = startOfDayIST();
    const weekStart = startOfWeek();

    const [todaysLeads, qualifiedToday, callsToday, weekLeads] = await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', todayStart)
        .in('status', ['qualified', 'site_visit_booked', 'visited']),
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabase
        .from('leads')
        .select('score')
        .gte('created_at', weekStart),
    ]);

    const scores = (weekLeads.data ?? []).map((l: { score: number }) => l.score);
    const avg = scores.length
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;

    return {
      todaysLeads: todaysLeads.count ?? 0,
      qualifiedToday: qualifiedToday.count ?? 0,
      callsToday: callsToday.count ?? 0,
      avgScoreWeek: avg,
    };
  } catch {
    return { todaysLeads: 0, qualifiedToday: 0, callsToday: 0, avgScoreWeek: 0 };
  }
}

async function getLeads(): Promise<PipelineLead[]> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('leads')
      .select(
        'id, full_name, source, status, score, last_contacted_at, projects(name)',
      )
      .order('created_at', { ascending: false })
      .limit(50);

    return (data ?? []).map((l: {
      id: string;
      full_name: string;
      source: string;
      status: string;
      score: number;
      last_contacted_at: string | null;
      projects: { name: string } | { name: string }[] | null;
    }) => {
      const projects = Array.isArray(l.projects) ? l.projects[0] : l.projects;
      return {
        id: l.id,
        full_name: l.full_name,
        source: l.source,
        status: l.status,
        score: l.score,
        last_contacted_at: l.last_contacted_at,
        project_name: projects?.name ?? null,
      };
    });
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gold/15 bg-dark-secondary p-5 transition-colors hover:border-gold/30">
      <p className="text-3xl font-semibold tabular-nums text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">{label}</p>
      {hint && <p className="mt-2 text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}

export default async function Home() {
  const [stats, leads] = await Promise.all([getStats(), getLeads()]);

  const istNow = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gold">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-400">
            Command center · Auto-refreshes every 30s
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
            IST
          </p>
          <p className="font-mono text-sm text-gray-300">{istNow}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Leads" value={stats.todaysLeads} hint="Created since 00:00 IST" />
        <StatCard
          label="Qualified Today"
          value={stats.qualifiedToday}
          hint="Qualified · Site visit · Visited"
        />
        <StatCard label="Calls Made Today" value={stats.callsToday} hint="Outbound voice agent" />
        <StatCard label="Avg Score (7d)" value={stats.avgScoreWeek} hint="Across new leads this week" />
      </div>

      {/* Table */}
      <PipelineTable leads={leads} />
    </div>
  );
}
