import Sidebar from '../components/sidebar';
import Topbar from '../components/topbar';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getSupabaseServer } from '@realty-engine/core';

export const dynamic = 'force-dynamic';

async function getUserEmail(): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

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
  const [clients, newLeadCount, userEmail] = await Promise.all([
    getClients(),
    getNewLeadCount(),
    getUserEmail(),
  ]);

  return (
    <div className="flex h-screen bg-dark-bg">
      <Sidebar
        clients={clients}
        newLeadCount={newLeadCount}
        currentClientSlug={null}
        userEmail={userEmail}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
