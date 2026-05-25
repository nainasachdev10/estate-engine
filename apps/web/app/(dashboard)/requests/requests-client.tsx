'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ExternalLink, Clock, User, Building2, BarChart2, MessageSquare } from 'lucide-react';

interface AccessRequest {
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const styles = {
    pending: 'bg-amber-900/40 text-amber-300 border-amber-500/20',
    approved: 'bg-green-900/40 text-green-300 border-green-500/20',
    rejected: 'bg-red-900/40 text-red-400 border-red-500/20',
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

function RequestCard({ req, onApprove, onReject }: {
  req: AccessRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const p = req.payload;
  const isPending = p.status === 'pending';

  async function handleApprove() {
    setLoading('approve');
    const res = await fetch('/api/admin/approve-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: req.id, email: p.email, fullName: p.fullName, company: p.company }),
    });
    if (res.ok) onApprove(req.id);
    setLoading(null);
  }

  async function handleReject() {
    setLoading('reject');
    const res = await fetch('/api/admin/reject-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: req.id }),
    });
    if (res.ok) onReject(req.id);
    setLoading(null);
  }

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isPending
        ? 'border-dark-tertiary bg-dark-secondary/60'
        : 'border-dark-tertiary/50 bg-dark-secondary/20 opacity-70'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{p.fullName}</h3>
            <StatusBadge status={p.status} />
          </div>
          <p className="mt-0.5 text-xs text-gray-400">{p.email}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-gray-600 flex-none">
          <Clock className="h-3 w-3" />
          {timeAgo(req.created_at)}
        </span>
      </div>

      {/* Details grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-500" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-gray-600">Company</p>
            <p className="text-xs font-medium text-gray-200">{p.company}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <BarChart2 className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-500" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-gray-600">Projects</p>
            <p className="text-xs font-medium text-gray-200">{p.activeProjects}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-500" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-gray-600">Monthly Leads</p>
            <p className="text-xs font-medium text-gray-200">{p.monthlyLeadVolume}</p>
          </div>
        </div>
        {p.portalSlug && (
          <div className="flex items-start gap-2">
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-500" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-gray-600">Portal</p>
              <a
                href={`/portal/${p.portalSlug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-gold hover:underline"
              >
                /portal/{p.portalSlug}
              </a>
            </div>
          </div>
        )}
      </div>

      {p.message && (
        <div className="mt-3 flex gap-2">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-600" />
          <p className="text-xs leading-relaxed text-gray-500">{p.message}</p>
        </div>
      )}

      {isPending && (
        <div className="mt-4 flex items-center gap-2 border-t border-dark-tertiary pt-4">
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Approve & create portal
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-dark-tertiary px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-red-500/25 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function RequestsClient({ requests }: { requests: AccessRequest[] }) {
  const router = useRouter();
  const [items, setItems] = useState(requests);

  function handleApprove(id: string) {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, payload: { ...r.payload, status: 'approved' as const, approvedAt: new Date().toISOString() } }
          : r
      )
    );
    router.refresh();
  }

  function handleReject(id: string) {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, payload: { ...r.payload, status: 'rejected' as const, rejectedAt: new Date().toISOString() } }
          : r
      )
    );
    router.refresh();
  }

  const pending = items.filter((r) => r.payload?.status === 'pending');
  const rest = items.filter((r) => r.payload?.status !== 'pending');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dark-tertiary bg-dark-secondary/30 py-20 text-center">
        <CheckCircle className="mb-3 h-10 w-10 text-gray-700" />
        <p className="text-sm font-medium text-gray-400">No access requests yet</p>
        <p className="mt-1 text-xs text-gray-600">Requests submitted via the landing page will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400">
            Pending · {pending.length}
          </p>
          <div className="space-y-3">
            {pending.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
            Reviewed · {rest.length}
          </p>
          <div className="space-y-3">
            {rest.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
