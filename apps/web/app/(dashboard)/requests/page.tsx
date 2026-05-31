import { getSupabaseServer } from '@realty-engine/core';
import RequestsClient from './requests-client';

export const dynamic = 'force-dynamic';

interface AccessRequestEvent {
  id: string;
  created_at: string;
  payload: {
    fullName: string;
    email: string;
    company: string;
    activeProjects: string;
    monthlyLeadVolume: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    portalSlug?: string;
  };
}

async function getRequests(): Promise<{ items: AccessRequestEvent[]; error: string | null }> {
  try {
    const db = getSupabaseServer();
    const { data, error } = await db
      .from('events')
      .select('id, created_at, payload')
      .eq('kind', 'access_request')
      .order('created_at', { ascending: false });
    if (error) return { items: [], error: error.message };
    return { items: (data ?? []) as AccessRequestEvent[], error: null };
  } catch (e) {
    return { items: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function RequestsPage() {
  const { items: requests, error } = await getRequests();
  const pending = requests.filter((r) => r.payload?.status === 'pending').length;

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#D4AF37' }}>Admin</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">Access Requests</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            {error
              ? 'Could not load requests'
              : pending > 0
                ? `${pending} pending request${pending === 1 ? '' : 's'} — approve to grant portal access`
                : 'No pending requests at the moment'}
          </p>
        </div>
      </div>
      {error ? (
        <div
          className="rounded-2xl border px-6 py-5 text-[14px] text-red-400"
          style={{ backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.18)' }}
        >
          <span className="font-bold uppercase tracking-wider text-[11px]">DB error · </span>
          <span className="text-gray-400">{error}</span>
        </div>
      ) : (
        <RequestsClient requests={requests} />
      )}
    </div>
  );
}
