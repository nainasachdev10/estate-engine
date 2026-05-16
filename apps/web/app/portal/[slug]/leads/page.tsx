import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

// TODO: Add magic-link auth.
// TODO: Enforce per-client RLS.

async function getClient(slug: string) {
  const supabase = getSupabaseServer();
  const { data: bySlug } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return bySlug;
  const { data: byId } = await supabase
    .from('clients')
    .select('id, name, brand_name, slug')
    .eq('id', slug)
    .maybeSingle();
  return byId;
}

async function getLeadsForClient(clientId: string) {
  const supabase = getSupabaseServer();
  const { data: projects } = await supabase.from('projects').select('id').eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return [];

  const { data } = await supabase
    .from('leads')
    .select('id, full_name, source, status, score, last_contacted_at, projects(name)')
    .in('project_id', projectIds)
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

export default async function PortalLeadsPage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const leads = await getLeadsForClient(client.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            {client.brand_name ?? client.name}
          </p>
          <h1
            className="font-serif text-3xl font-bold text-[#d4af37]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Lead Pipeline
          </h1>
        </div>
        <Link href={`/portal/${params.slug}`} className="text-xs text-white/60 hover:text-[#d4af37]">
          ← Back to overview
        </Link>
      </header>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-12 text-center text-white/50">
          No leads yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {leads.map((l: any) => (
                <tr
                  key={l.id}
                  className="cursor-pointer hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/leads/${l.id}`} className="hover:text-[#d4af37]">
                      {maskName(l.full_name)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{l.projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{l.source}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className={`px-4 py-3 font-mono ${l.score >= 70 ? 'text-green-400' : l.score >= 40 ? 'text-yellow-400' : 'text-white/40'}`}>
                    {l.score}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
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
