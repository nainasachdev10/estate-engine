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
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-gold">Bulk Lead Upload</h1>
        <p className="text-gray-400 mt-1">Upload a CSV — each lead auto-triggers a voice call within 2 minutes.</p>
      </div>
      <BulkUploadClient projects={projects} />
    </div>
  );
}
