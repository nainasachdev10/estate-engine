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
    <div className="rounded-lg border border-gold/15 bg-dark-secondary p-5 transition-colors hover:border-gold/30">
      <p className="text-3xl font-semibold tabular-nums text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">{label}</p>
      {hint && <p className="mt-2 text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}

function ViewToggle({ view }: { view: 'kanban' | 'table' }) {
  const base =
    'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors';
  const active = 'bg-gold/10 text-gold ring-1 ring-inset ring-gold/30';
  const idle = 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
  return (
    <div className="flex items-center gap-1 rounded-md border border-dark-tertiary bg-dark-secondary p-1">
      <Link href="/pipeline?view=kanban" className={`${base} ${view === 'kanban' ? active : idle}`}>
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </Link>
      <Link href="/pipeline?view=table" className={`${base} ${view === 'table' ? active : idle}`}>
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
    <div className="p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-400">
            Command center · {leads.length} leads · as of {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ViewToggle view={view} />
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">IST</p>
            <p className="font-mono text-sm text-gray-300">{istNow}</p>
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
