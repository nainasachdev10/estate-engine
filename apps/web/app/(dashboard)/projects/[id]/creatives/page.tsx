import { getSupabaseServer } from '@realty-engine/core';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <div className="p-6 md:p-8" style={{ backgroundColor: '#000' }}>
      <div className="mb-8">
        <Link
          href={`/projects/${params.id}`}
          className="mb-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
        >
          <ArrowLeft className="h-3 w-3" /> Back to project
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>
              {(project as any).clients?.brand_name ?? (project as any).clients?.name} · {project.location ?? '—'}
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">{project.name} · Creatives</h1>
            <p className="mt-1 text-[14px] text-gray-500">
              Claude-generated ad variants. Mark as launched when you push to Meta / Google.
            </p>
          </div>
        </div>
      </div>

      <CreativesClient projectId={params.id} initialCampaigns={campaigns} />
    </div>
  );
}
