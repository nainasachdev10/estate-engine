'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, AlertTriangle } from 'lucide-react';
import PortalLinkBlock from './portal-link-block';

export interface AccessRequest {
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

const STATUS_STYLES = {
  pending: 'bg-amber-900/30 text-amber-300 border-amber-500/25',
  approved: 'bg-emerald-900/30 text-emerald-300 border-emerald-500/25',
  rejected: 'bg-red-900/30 text-red-400 border-red-500/25',
} as const;

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dark-tertiary/60 bg-dark-bg/40 px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: AccessRequest;
  onApprove: (id: string, portalSlug?: string) => void;
  onReject: (id: string) => void;
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const p = req.payload;
  const isPending = p.status === 'pending';
  const isApproved = p.status === 'approved';

  async function handleApprove() {
    setLoading('approve');
    setCardError(null);
    setEmailWarning(null);
    try {
      const res = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: req.id, email: p.email, fullName: p.fullName, company: p.company }),
      });
      const data = await res.json();
      if (res.ok) {
        onApprove(req.id, data.portalSlug);
        if (!data.emailSent) setEmailWarning(data.emailError ?? 'Email not sent — check BREVO_API_KEY and BREVO_SENDER_EMAIL');
      } else {
        setCardError(data?.error ?? 'Approval failed — try again');
      }
    } catch {
      setCardError('Network error — try again');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading('reject');
    setCardError(null);
    setEmailWarning(null);
    try {
      const res = await fetch('/api/admin/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: req.id }),
      });
      const data = await res.json();
      if (res.ok) {
        onReject(req.id);
        if (!data.emailSent) setEmailWarning(data.emailError ?? 'Email not sent — check BREVO_API_KEY and BREVO_SENDER_EMAIL');
      } else {
        setCardError(data?.error ?? 'Rejection failed — try again');
      }
    } catch {
      setCardError('Network error — try again');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isPending
          ? 'border-dark-tertiary bg-dark-secondary/70 hover:border-gold/25'
          : 'border-dark-tertiary/50 bg-dark-secondary/30'
      }`}
    >
      {/* Top: name + company + email + timestamp + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base font-semibold text-white">{p.fullName}</h3>
            <span className="text-sm font-medium text-gray-300">· {p.company}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500">{p.email}</p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <StatusBadge status={p.status} />
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
            <Clock className="h-3 w-3" />
            {timeAgo(req.created_at)}
          </span>
        </div>
      </div>

      {/* Middle: stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCell label="Active Projects" value={p.activeProjects || '—'} />
        <StatCell label="Monthly Lead Volume" value={p.monthlyLeadVolume || '—'} />
      </div>

      {/* Message */}
      {p.message && (
        <div className="mt-4 rounded-lg border border-dark-tertiary/50 bg-dark-bg/40 px-3 py-2.5">
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-gray-500">Message</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-300">{p.message}</p>
        </div>
      )}

      {/* Approved portal link */}
      {isApproved && p.portalSlug && <PortalLinkBlock slug={p.portalSlug} />}

      {/* Email warning — shown after action if email failed */}
      {emailWarning && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-400" />
          <p className="text-xs text-amber-300">{emailWarning}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="mt-5 flex flex-col gap-2 border-t border-dark-tertiary pt-4 sm:flex-row sm:items-center">
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#c9a137] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Approve &amp; create portal
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dark-tertiary px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Reject
          </button>
          {cardError && <p className="text-xs text-red-400 sm:ml-2">{cardError}</p>}
        </div>
      )}
    </div>
  );
}
