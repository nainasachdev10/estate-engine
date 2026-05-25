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
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Access Requests</h1>
        <p className="mt-1 text-sm text-gray-400">
          {error
            ? 'Could not load requests'
            : pending > 0
              ? `${pending} pending request${pending === 1 ? '' : 's'} — approve to give portal access`
              : 'No pending requests'}
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-900/10 px-5 py-4 text-sm text-red-400">
          <span className="font-medium">DB error: </span>{error}
        </div>
      ) : (
        <RequestsClient requests={requests} />
      )}
    </div>
  );
}
