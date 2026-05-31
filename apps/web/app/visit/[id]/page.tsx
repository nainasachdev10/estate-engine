import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@realty-engine/core';
import VisitForm from './visit-form';

export const dynamic = 'force-dynamic';

export default async function VisitPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, full_name, projects(id, name, location, clients(brand_name, logo_url))')
    .eq('id', params.id)
    .single();

  if (!lead) notFound();

  const project = Array.isArray(lead.projects) ? lead.projects[0] : lead.projects as any;
  const client = Array.isArray(project?.clients) ? project?.clients[0] : project?.clients as any;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {client?.logo_url && (
          <img
            src={client.logo_url}
            alt={client.brand_name ?? ''}
            className="h-10 mb-8 mx-auto object-contain"
          />
        )}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37] mb-2">
            {client?.brand_name}
          </p>
          <h1
            className="font-serif text-3xl text-white mb-1"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Schedule Your Visit
          </h1>
          <p className="text-white/50 text-sm">
            {project?.name} · {project?.location}
          </p>
        </div>
        <VisitForm leadId={lead.id} leadName={lead.full_name} />
      </div>
    </div>
  );
}
