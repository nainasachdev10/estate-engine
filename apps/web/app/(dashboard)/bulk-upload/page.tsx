import BulkUploadClient from './bulk-upload-client';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getProjects() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('projects')
    .select('id, name, clients(name)')
    .eq('status', 'active')
    .order('name');
  return (data ?? []) as any[];
}

export default async function BulkUploadPage() {
  const projects = await getProjects();

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: '#D4AF37' }}>Admin</p>
          <h1 className="mt-3 font-display text-[28px] font-bold uppercase leading-none tracking-[-0.01em] text-white md:text-[32px]">Bulk Lead Upload</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Upload a CSV — each lead auto-triggers a voice call within 2 minutes.
          </p>
        </div>
      </div>
      <BulkUploadClient projects={projects} />
    </div>
  );
}
