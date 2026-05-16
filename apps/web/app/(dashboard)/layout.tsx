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
    return [];
  }
}

async function getNewLeadCount(): Promise<number> {
  try {
    const supabase = getSupabaseServer();
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [clients, newLeadCount] = await Promise.all([getClients(), getNewLeadCount()]);

  return (
    <div className="flex h-screen">
      <Sidebar
        clients={clients}
        newLeadCount={newLeadCount}
        currentClientSlug={null}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
