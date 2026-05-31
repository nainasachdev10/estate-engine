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

const STATUS_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  new: { backgroundColor: 'rgba(96,165,250,0.10)', color: '#93c5fd' },
  contacted: { backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24' },
  qualified: { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' },
  site_visit_booked: { backgroundColor: 'rgba(167,139,250,0.10)', color: '#c4b5fd' },
  visited: { backgroundColor: 'rgba(129,140,248,0.10)', color: '#a5b4fc' },
  negotiating: { backgroundColor: 'rgba(251,146,60,0.10)', color: '#fb923c' },
  closed_won: { backgroundColor: 'rgba(74,222,128,0.10)', color: '#4ade80' },
  closed_lost: { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' },
  unresponsive: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' },
};

function scoreStyle(score: number): { backgroundColor: string; color: string } {
  if (score >= 80) return { backgroundColor: 'rgba(52,211,153,0.10)', color: '#4ade80' };
  if (score >= 65) return { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' };
  return { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' };
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
      style={
        STATUS_STYLE[status] ?? {
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: '#6B7280',
        }
      }
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
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            Leads
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">
            All Leads
          </h1>
          <p className="mt-1 text-[14px] text-gray-500">
            {projectId
              ? `Project: ${projectName ?? projectId} · `
              : 'Sorted by score · '}
            <span className="font-mono text-gray-400">{leads.length}</span>{' '}
            {leads.length === 1 ? 'lead' : 'leads'} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton projectId={projectId} status={status} />
          {projectId && (
            <Link
              href="/leads"
              className="rounded-xl border px-4 py-2.5 text-[13px] font-medium text-gray-400 transition-all hover:text-white"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
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
              className="rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.10em] transition-all"
              style={
                active
                  ? {
                      backgroundColor: 'rgba(212,175,55,0.10)',
                      color: '#D4AF37',
                      border: '1px solid rgba(212,175,55,0.28)',
                    }
                  : {
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      color: '#6B7280',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border py-20 text-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.01)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[15px] font-bold text-white">No leads to show.</p>
          <p className="max-w-sm text-[14px] text-gray-500 leading-relaxed">
            {projectId
              ? 'This project has no leads yet.'
              : 'Leads will appear here as soon as your campaigns deliver.'}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ backgroundColor: '#090909' }}>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Project
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Source
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Score
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#090909' }}>
                {leads.map((l) => {
                  const project = Array.isArray(l.projects) ? l.projects[0] : l.projects;
                  return (
                    <tr
                      key={l.id}
                      className="border-b transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/leads/${l.id}`}
                          className="text-[14px] font-bold text-white transition-colors hover:text-[#D4AF37]"
                        >
                          {maskName(l.full_name)}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-gray-400">
                        {project?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-600">
                        {l.source}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                          style={scoreStyle(l.score)}
                        >
                          {l.score}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[12px] text-gray-500">
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
        </div>
      )}
    </div>
  );
}
