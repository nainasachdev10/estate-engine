import Sidebar from '../components/sidebar';
import Topbar from '../components/topbar';
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

async function getPendingRequestCount(): Promise<number> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('events')
      .select('id, payload')
      .eq('kind', 'access_request');
    return (data ?? []).filter((e: { payload?: { status?: string } }) => e.payload?.status === 'pending').length;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [clients, newLeadCount, pendingRequests] = await Promise.all([
    getClients(),
    getNewLeadCount(),
    getPendingRequestCount(),
  ]);

  return (
    <div className="flex h-screen bg-dark-bg">
      <Sidebar
        clients={clients}
        newLeadCount={newLeadCount}
        pendingRequests={pendingRequests}
        currentClientSlug={null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
