import { getSupabaseServer } from '@realty-engine/core';
import { notFound } from 'next/navigation';
import CreativesClient from './creatives-client';

export const dynamic = 'force-dynamic';

async function getProject(id: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, location, segment, clients(name, brand_name)')
    .eq('id', id)
    .single();
  return data;
}

async function getCampaigns(projectId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export default async function CreativesPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const campaigns = await getCampaigns(params.id);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
            {(project as any).clients?.brand_name ?? (project as any).clients?.name} · {project.location ?? '—'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{project.name} · Creatives</h1>
          <p className="text-sm text-gray-400 mt-1">
            Claude-generated ad variants. Mark as launched when you push to Meta / Google.
          </p>
        </div>
      </div>

      <CreativesClient projectId={params.id} initialCampaigns={campaigns} />
    </div>
  );
}
