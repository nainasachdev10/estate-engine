import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';
import ExportButton from './export-button';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'site_visit_booked', label: 'Site Visit' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'closed_won', label: 'Closed Won' },
];

interface LeadRow {
  id: string;
  full_name: string;
  phone_e164: string;
  source: string;
  status: string;
  score: number;
  last_contacted_at: string | null;
  projects: { id: string; name: string } | { id: string; name: string }[] | null;
}

async function getLeads(projectId?: string, status?: string) {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('leads')
    .select(
      'id, full_name, phone_e164, source, status, score, last_contacted_at, projects(id, name)',
    )
    .order('score', { ascending: false })
    .limit(200);
  if (projectId) q = q.eq('project_id', projectId);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as LeadRow[];
}

async function getProjectName(projectId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

function maskName(name: string): string {
  return name.split(' ').map((p) => (p.length > 2 ? `${p[0]}***` : p)).join(' ');
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-900/60 text-blue-300',
    contacted: 'bg-yellow-900/60 text-yellow-300',
    qualified: 'bg-green-900/60 text-green-300',
    site_visit_booked: 'bg-purple-900/60 text-purple-300',
    visited: 'bg-indigo-900/60 text-indigo-300',
    negotiating: 'bg-orange-900/60 text-orange-300',
    closed_won: 'bg-emerald-900/60 text-emerald-300',
    closed_lost: 'bg-red-900/60 text-red-300',
    unresponsive: 'bg-gray-800/80 text-gray-400',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { project?: string; status?: string };
}) {
  const projectId = searchParams?.project;
  const status = searchParams?.status ?? 'all';
  const [leads, projectName] = await Promise.all([
    getLeads(projectId, status),
    projectId ? getProjectName(projectId) : Promise.resolve(null),
  ]);

  const chipHref = (key: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set('project', projectId);
    if (key !== 'all') params.set('status', key);
    const qs = params.toString();
    return qs ? `/leads?${qs}` : '/leads';
  };

  return (
    <div className="p-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Leads</h1>
          <p className="mt-1 text-sm text-gray-400">
            {projectId
              ? `Project: ${projectName ?? projectId} · ${leads.length} leads`
              : `Sorted by score · ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          {projectId && (
            <Link
              href="/leads"
              className="rounded-md border border-dark-tertiary bg-dark-secondary px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
            >
              Clear filter
            </Link>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Link
              key={f.key}
              href={chipHref(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${active
                  ? 'bg-gold/10 text-gold ring-1 ring-inset ring-gold/30'
                  : 'border border-dark-tertiary text-gray-400 hover:border-gold/20 hover:text-white'}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-dark-tertiary bg-dark-secondary/40 p-12 text-center">
          <p className="text-gray-300">No leads to show.</p>
          <p className="mt-1 text-sm text-gray-500">
            {projectId
              ? 'This project has no leads yet.'
              : 'Leads will appear here as soon as your campaigns deliver.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dark-tertiary">
          <table className="w-full text-sm">
            <thead className="bg-dark-secondary text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary bg-dark-secondary/40">
              {leads.map((l) => {
                const project = Array.isArray(l.projects) ? l.projects[0] : l.projects;
                return (
                  <tr key={l.id} className="transition-colors hover:bg-dark-tertiary/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${l.id}`}
                        className="font-medium text-white hover:text-gold"
                      >
                        {maskName(l.full_name)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">
                      {l.source}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${l.score >= 70 ? 'text-green-400' : l.score >= 40 ? 'text-yellow-400' : 'text-gray-500'}`}
                    >
                      {l.score}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {l.last_contacted_at
                        ? new Date(l.last_contacted_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
