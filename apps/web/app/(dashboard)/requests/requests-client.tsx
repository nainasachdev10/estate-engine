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
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center"
        style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <Inbox className="h-7 w-7 text-gray-600" />
        </div>
        <p className="text-[14px] font-semibold text-gray-300">No access requests yet</p>
        <p className="mt-1.5 text-[12px] text-gray-500">
          Requests submitted via the landing page will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {pending.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: '#D4AF37' }}
            >
              Pending
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }}
            >
              {pending.length}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="grid gap-4">
            {pending.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </section>
      )}
      {rest.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
              Reviewed
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-gray-500"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              {rest.length}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
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
