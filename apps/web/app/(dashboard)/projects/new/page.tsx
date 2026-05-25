import { getSupabaseServer } from '@realty-engine/core';
import { redirect } from 'next/navigation';
import CreateProjectClient from './create-project-client';

export const dynamic = 'force-dynamic';

async function getClients() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('clients')
    .select('id, name, brand_name')
    .eq('status', 'active')
    .order('name', { ascending: true });
  return data ?? [];
}

export default async function NewProjectPage() {
  const clients = await getClients();
  if (clients.length === 0) {
    redirect('/settings?error=no-clients');
  }
  return <CreateProjectClient clients={clients} />;
}
