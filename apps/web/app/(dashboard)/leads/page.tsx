import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

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

async function getLeads(projectId?: string) {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('leads')
    .select(
      'id, full_name, phone_e164, source, status, score, last_contacted_at, projects(id, name)',
    )
    .order('score', { ascending: false })
    .limit(200);
  if (projectId) q = q.eq('project_id', projectId);
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
  searchParams?: { project?: string };
}) {
  const projectId = searchParams?.project;
  const [leads, projectName] = await Promise.all([
    getLeads(projectId),
    projectId ? getProjectName(projectId) : Promise.resolve(null),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gold">Leads</h1>
          <p className="mt-1 text-sm text-gray-400">
            {projectId
              ? `Filtered by project: ${projectName ?? projectId} · ${leads.length} leads`
              : `Top 200 leads sorted by score · ${leads.length} shown`}
          </p>
        </div>
        {projectId && (
          <Link
            href="/leads"
            className="rounded border border-dark-tertiary bg-dark-secondary px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
          >
            Clear filter
          </Link>
        )}
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
