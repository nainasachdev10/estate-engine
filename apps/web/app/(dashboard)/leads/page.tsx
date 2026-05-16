import Link from 'next/link';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getLeads() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, source, status, score, last_contacted_at, projects(name)')
    .order('score', { ascending: false })
    .limit(200);
  return data ?? [];
}

function maskName(name: string): string {
  return name.split(' ').map((p) => (p.length > 2 ? `${p[0]}***` : p)).join(' ');
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-900 text-blue-300',
    contacted: 'bg-yellow-900 text-yellow-300',
    qualified: 'bg-green-900 text-green-300',
    site_visit_booked: 'bg-purple-900 text-purple-300',
    visited: 'bg-indigo-900 text-indigo-300',
    negotiating: 'bg-orange-900 text-orange-300',
    closed_won: 'bg-emerald-900 text-emerald-300',
    closed_lost: 'bg-red-900 text-red-300',
    unresponsive: 'bg-gray-800 text-gray-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-gold">Leads</h1>
        <p className="text-sm text-gray-400 mt-1">Top 200 leads sorted by score</p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center text-gray-400">
          No leads yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dark-tertiary">
          <table className="w-full text-sm">
            <thead className="bg-dark-secondary text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary">
              {leads.map((l: any) => (
                <tr key={l.id} className="hover:bg-dark-secondary">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.id}`} className="font-medium text-white hover:text-gold">
                      {maskName(l.full_name)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{l.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{l.source}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className={`px-4 py-3 font-mono ${l.score >= 70 ? 'text-green-400' : l.score >= 40 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {l.score}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {l.last_contacted_at
                      ? new Date(l.last_contacted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
