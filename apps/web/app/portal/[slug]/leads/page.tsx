import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';
import LeadsTable, { type LeadRow, type LeadStatus } from '../components/leads-table';

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

async function getLeadsForClient(clientId: string): Promise<LeadRow[]> {
  const supabase = getSupabaseServer();
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', clientId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return [];

  const { data } = await supabase
    .from('leads')
    .select('id, full_name, source, status, score, last_contacted_at, projects(name)')
    .in('project_id', projectIds)
    .order('score', { ascending: false })
    .limit(500);

  return (data ?? []).map((l: any) => {
    const projectName = Array.isArray(l.projects) ? l.projects[0]?.name : l.projects?.name;
    return {
      id: l.id as string,
      full_name: (l.full_name as string) ?? '',
      source: (l.source as string | null) ?? null,
      status: l.status as LeadStatus,
      score: (l.score as number) ?? 0,
      last_contacted_at: (l.last_contacted_at as string | null) ?? null,
      project_name: (projectName as string | undefined) ?? null,
    } satisfies LeadRow;
  });
}

export default async function PortalLeadsPage({ params }: { params: { slug: string } }) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const leads = await getLeadsForClient(client.id);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header
        className="mb-10 flex flex-col gap-3 border-b pb-8 md:flex-row md:items-end md:justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div>
          <p
            className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            {client.brand_name ?? client.name}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            Pipeline
          </h1>
          <p className="mt-3 text-[14px] text-gray-400 leading-relaxed">
            {leads.length} lead{leads.length === 1 ? '' : 's'} · sorted by score
          </p>
        </div>
      </header>

      <LeadsTable initialLeads={leads} />
    </div>
  );
}
