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
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"
      style={{ backgroundColor: '#000' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[400px] w-[400px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(212,175,55,0.10), transparent 65%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {client?.logo_url && (
          <img
            src={client.logo_url}
            alt={client.brand_name ?? ''}
            className="mx-auto mb-8 h-10 object-contain"
          />
        )}
        <div className="mb-8 text-center">
          <p
            className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#D4AF37' }}
          >
            {client?.brand_name}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Schedule Your Visit
          </h1>
          <p className="mt-2 text-[14px] text-gray-500">
            {project?.name} · {project?.location}
          </p>
        </div>
        <VisitForm leadId={lead.id} leadName={lead.full_name} />
      </div>
    </main>
  );
}
