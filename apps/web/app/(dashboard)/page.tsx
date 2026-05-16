import { getSupabaseServer } from '@realty-engine/core';
import TriggerCallButton from '@/app/components/trigger-call-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLeads() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('leads')
    .select('id, full_name, phone_e164, status, score, source, last_contacted_at, projects(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

function maskName(name: string): string {
  const parts = name.split(' ');
  return parts.map(p => p.length > 2 ? `${p[0]}***` : p).join(' ');
}

function statusBadge(status: string) {
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
  return colors[status] ?? 'bg-gray-800 text-gray-400';
}

export default async function Home() {
  const leads = await getLeads();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gold">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-1">Last 50 leads · Auto-refreshes every 30s</p>
        </div>
        <span className="text-sm text-gray-500">{leads.length} leads</span>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center">
          <p className="text-gray-400 mb-2">No leads yet.</p>
          <p className="text-sm text-gray-500">
            POST to <code className="text-gold">/api/leads/intake</code> to add your first lead.
          </p>
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
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary">
              {leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-dark-secondary transition-colors">
                  <td className="px-4 py-3 font-medium">{maskName(lead.full_name)}</td>
                  <td className="px-4 py-3 text-gray-300">{lead.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{lead.source}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(lead.status)}`}>
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-sm ${lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <TriggerCallButton leadId={lead.id} />
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
