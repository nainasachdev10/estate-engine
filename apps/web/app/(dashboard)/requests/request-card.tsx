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

const STATUS_STYLES: Record<'pending' | 'approved' | 'rejected', { bg: string; color: string }> = {
  pending: { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24' },
  approved: { bg: 'rgba(52,211,153,0.10)', color: '#34d399' },
  rejected: { bg: 'rgba(248,113,113,0.10)', color: '#f87171' },
};

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-white">{value}</p>
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
  const isRejected = p.status === 'rejected';

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
      className="rounded-2xl border p-6 transition-all duration-200"
      style={{
        backgroundColor: isPending ? '#0a0a0a' : '#090909',
        borderColor: isPending
          ? 'rgba(212,175,55,0.18)'
          : isRejected
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.05)',
        opacity: isRejected ? 0.7 : 1,
      }}
    >
      {/* Top: name + company + email + timestamp + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-[16px] font-bold text-white">{p.fullName}</h3>
            <span className="text-[13px] font-medium text-gray-400">· {p.company}</span>
          </div>
          <p className="mt-1 truncate text-[12px] font-mono text-gray-600">{p.email}</p>
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          <StatusBadge status={p.status} />
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-gray-600">
            <Clock className="h-3 w-3" />
            {timeAgo(req.created_at)}
          </span>
        </div>
      </div>

      {/* Middle: stats grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatCell label="Active Projects" value={p.activeProjects || '—'} />
        <StatCell label="Monthly Lead Volume" value={p.monthlyLeadVolume || '—'} />
      </div>

      {/* Message */}
      {p.message && (
        <div
          className="mt-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">Message</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-400">{p.message}</p>
        </div>
      )}

      {/* Approved portal link */}
      {isApproved && p.portalSlug && <PortalLinkBlock slug={p.portalSlug} />}

      {/* Email warning — shown after action if email failed */}
      {emailWarning && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3"
          style={{ backgroundColor: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.18)' }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" style={{ color: '#fbbf24' }} />
          <p className="text-[12px] leading-relaxed" style={{ color: '#fbbf24' }}>{emailWarning}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div
          className="mt-6 flex flex-col gap-2.5 border-t pt-5 sm:flex-row sm:items-center"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Approve &amp; create portal
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium text-gray-500 transition-all hover:text-red-400 hover:border-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Reject
          </button>
          {cardError && <p className="text-[12px] text-red-400 sm:ml-2">{cardError}</p>}
        </div>
      )}
    </div>
  );
}
