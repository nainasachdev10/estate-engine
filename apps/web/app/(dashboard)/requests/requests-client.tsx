'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import RequestCard, { type AccessRequest } from './request-card';

export default function RequestsClient({ requests }: { requests: AccessRequest[] }) {
  const router = useRouter();
  const [items, setItems] = useState(requests);

  function handleApprove(id: string, portalSlug?: string) {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              payload: {
                ...r.payload,
                status: 'approved' as const,
                approvedAt: new Date().toISOString(),
                ...(portalSlug ? { portalSlug } : {}),
              },
            }
          : r
      )
    );
    router.refresh();
  }

  function handleReject(id: string) {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              payload: { ...r.payload, status: 'rejected' as const, rejectedAt: new Date().toISOString() },
            }
          : r
      )
    );
    router.refresh();
  }

  const pending = items.filter((r) => r.payload?.status === 'pending');
  const rest = items.filter((r) => r.payload?.status !== 'pending');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-tertiary bg-dark-secondary/40 py-20 text-center">
        <Inbox className="mb-3 h-10 w-10 text-gray-600" />
        <p className="text-sm font-medium text-gray-300">No access requests yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Requests submitted via the landing page will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">
            Pending · {pending.length}
          </p>
          <div className="grid gap-4">
            {pending.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </section>
      )}
      {rest.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
            Reviewed · {rest.length}
          </p>
          <div className="grid gap-4">
            {rest.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
