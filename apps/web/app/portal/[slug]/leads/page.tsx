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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-2 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#d4af37]">
            {client.brand_name ?? client.name}
          </p>
          <h1
            className="font-serif text-4xl font-bold text-[#d4af37]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Pipeline
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {leads.length} lead{leads.length === 1 ? '' : 's'} · sorted by score
          </p>
        </div>
      </header>

      <LeadsTable initialLeads={leads} />
    </div>
  );
}
