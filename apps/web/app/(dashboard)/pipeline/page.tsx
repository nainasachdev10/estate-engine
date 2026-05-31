import Link from 'next/link';
import { LayoutGrid, Table2 } from 'lucide-react';
import { getSupabaseServer } from '@realty-engine/core';
import PipelineTable, { type PipelineLead } from '../pipeline-table';
import KanbanBoard, { type KanbanLead } from './kanban-board';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Stats {
  todaysLeads: number;
  qualifiedToday: number;
  callsToday: number;
  avgScoreWeek: number;
}

interface RawLead {
  id: string;
  full_name: string;
  source: string;
  status: string;
  score: number;
  created_at: string;
  last_contacted_at: string | null;
  projects: { name: string } | { name: string }[] | null;
}

function startOfDayIST(): string {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const istMidnight = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0),
  );
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
      supabase.from('leads').select('score').gte('created_at', weekStart),
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

async function getLeads(): Promise<RawLead[]> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('leads')
      .select(
        'id, full_name, source, status, score, created_at, last_contacted_at, projects(name)',
      )
      .order('created_at', { ascending: false })
      .limit(500);
    return (data ?? []) as RawLead[];
  } catch {
    return [];
  }
}

function projectName(p: RawLead['projects']): string | null {
  const project = Array.isArray(p) ? p[0] : p;
  return project?.name ?? null;
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
    <div
      className="relative overflow-hidden rounded-2xl border p-5 transition-all duration-200"
      style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
        }}
      />
      <p
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500"
      >
        {label}
      </p>
      <p
        className="mt-3 font-mono text-3xl font-black tabular-nums"
        style={{ color: '#D4AF37' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

function ViewToggle({ view }: { view: 'kanban' | 'table' }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] transition-all';
  return (
    <div
      className="flex items-center gap-1 rounded-xl border p-1"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <Link
        href="/pipeline?view=kanban"
        className={base}
        style={
          view === 'kanban'
            ? { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }
            : { color: '#6B7280' }
        }
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </Link>
      <Link
        href="/pipeline?view=table"
        className={base}
        style={
          view === 'table'
            ? { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }
            : { color: '#6B7280' }
        }
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </Link>
    </div>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const view: 'kanban' | 'table' = searchParams?.view === 'table' ? 'table' : 'kanban';
  const [stats, leads] = await Promise.all([getStats(), getLeads()]);

  const kanbanLeads: KanbanLead[] = leads.map((l) => ({
    id: l.id,
    full_name: l.full_name,
    status: l.status,
    score: l.score,
    project_name: projectName(l.projects),
    created_at: l.created_at,
  }));

  const tableLeads: PipelineLead[] = leads.slice(0, 100).map((l) => ({
    id: l.id,
    full_name: l.full_name,
    source: l.source,
    status: l.status,
    score: l.score,
    last_contacted_at: l.last_contacted_at,
    project_name: projectName(l.projects),
  }));

  const istNow = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Pipeline
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">
            Lead Pipeline
          </h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Live kanban auto-refreshes every 30 seconds —{' '}
            <span className="font-mono text-gray-400">{leads.length}</span> leads
            in flight
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} />
          <div
            className="rounded-xl border px-3 py-2 text-right"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-gray-600">
              IST
            </p>
            <p className="mt-0.5 font-mono text-[13px] font-bold text-white">
              {istNow}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Leads" value={stats.todaysLeads} hint="Created since 00:00 IST" />
        <StatCard
          label="Qualified Today"
          value={stats.qualifiedToday}
          hint="Qualified · Site visit · Visited"
        />
        <StatCard label="Calls Made Today" value={stats.callsToday} hint="Outbound voice agent" />
        <StatCard label="Avg Score (7d)" value={stats.avgScoreWeek} hint="New leads this week" />
      </div>

      {view === 'kanban' ? (
        <KanbanBoard leads={kanbanLeads} />
      ) : (
        <PipelineTable leads={tableLeads} />
      )}
    </div>
  );
}
