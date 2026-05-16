import Sidebar from '../components/sidebar';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getClients() {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('clients')
      .select('id, name, brand_name, slug')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    return data ?? [];
  } catch {
    // Supabase env may not be available at build time
    return [];
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const clients = await getClients();

  return (
    <div className="flex h-screen">
      <Sidebar clients={clients} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
