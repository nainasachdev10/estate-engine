'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Pause, Play, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../../../components/toast-provider';

export interface ActionPanelLead {
  id: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  source: string;
  language_pref: string;
  score: number;
  created_at: string;
  status: LeadStatus;
  notes: string | null;
  sequence_paused: boolean;
  sequence_name: string | null;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit_booked'
  | 'visited'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'unresponsive';

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'site_visit_booked', label: 'Site Visit Booked' },
  { value: 'visited', label: 'Visited' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed_won', label: 'Closed — Won' },
  { value: 'closed_lost', label: 'Closed — Lost' },
  { value: 'unresponsive', label: 'Unresponsive' },
];

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: 'bg-blue-900/60 text-blue-300 ring-blue-500/30',
  contacted: 'bg-yellow-900/60 text-yellow-300 ring-yellow-500/30',
  qualified: 'bg-green-900/60 text-green-300 ring-green-500/30',
  site_visit_booked: 'bg-purple-900/60 text-purple-300 ring-purple-500/30',
  visited: 'bg-indigo-900/60 text-indigo-300 ring-indigo-500/30',
  negotiating: 'bg-orange-900/60 text-orange-300 ring-orange-500/30',
  closed_won: 'bg-emerald-900/60 text-emerald-300 ring-emerald-500/30',
  closed_lost: 'bg-red-900/60 text-red-300 ring-red-500/30',
  unresponsive: 'bg-gray-800/80 text-gray-400 ring-gray-600/30',
};

function maskPhone(phone: string): string {
  // +919876543210 -> +91 98***43210
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)}***${phone.slice(-5)}`;
}

function scoreClass(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-gray-500';
}

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-gray-600';
}

export default function ActionPanel({ lead }: { lead: ActionPanelLead }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [seqLoading, setSeqLoading] = useState(false);
  const [paused, setPaused] = useState(lead.sequence_paused);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  async function handleStatusChange(next: LeadStatus) {
    const prev = status;
    setStatus(next); // optimistic
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success(`Status updated to ${next.replace(/_/g, ' ')}`);
      startTransition(() => router.refresh());
    } catch {
      setStatus(prev); // rollback
      toast.error('Could not update status');
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleCall() {
    setCallLoading(true);
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error ?? 'Could not trigger call');
      } else {
        toast.success('Call queued — agent dialing now');
        startTransition(() => router.refresh());
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCallLoading(false);
    }
  }

  async function handleSequenceToggle() {
    const nextPaused = !paused;
    setSeqLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/sequence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextPaused }),
      });
      if (!res.ok) throw new Error('failed');
      setPaused(nextPaused);
      toast.success(nextPaused ? 'Sequence paused' : 'Sequence resumed');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Could not update sequence');
    } finally {
      setSeqLoading(false);
    }
  }

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed }),
      });
      if (!res.ok) throw new Error('failed');
      setNoteDraft('');
      toast.success('Note saved');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Could not save note');
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <aside className="sticky top-6 space-y-6">
      {/* LEAD INFO */}
      <section className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
        <h3 className="mb-4 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
          Lead Info
        </h3>

        <div className="mb-4">
          <p className="text-base font-semibold text-white">{lead.full_name}</p>
          <p className="font-mono text-xs text-gray-400">{maskPhone(lead.phone_e164)}</p>
          {lead.email && (
            <p className="truncate text-xs text-gray-500">{lead.email}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-gray-500">Source</dt>
            <dd className="mt-0.5 capitalize text-gray-200">{lead.source}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Language</dt>
            <dd className="mt-0.5 capitalize text-gray-200">{lead.language_pref}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Created</dt>
            <dd className="mt-0.5 text-gray-200">
              {new Date(lead.created_at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
        </dl>

        {/* Score bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-gray-500">
            <span>Score</span>
            <span className={`font-mono text-sm ${scoreClass(lead.score)}`}>
              {lead.score}/100
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-dark-tertiary">
            <div
              className={`h-full rounded-full transition-all ${scoreBarColor(lead.score)}`}
              style={{ width: `${Math.max(0, Math.min(100, lead.score))}%` }}
            />
          </div>
        </div>
      </section>

      {/* STATUS */}
      <section className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
          Status
        </h3>
        <div className="mb-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ring-1 ring-inset ${STATUS_BADGE[status]}`}
          >
            {status.replace(/_/g, ' ')}
          </span>
        </div>
        <label htmlFor="status-select" className="sr-only">
          Change status
        </label>
        <div className="relative">
          <select
            id="status-select"
            value={status}
            disabled={statusSaving}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="w-full appearance-none rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 pr-9 text-sm text-white focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-60"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusSaving && (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gold" />
          )}
        </div>
      </section>

      {/* ACTIONS */}
      <section className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
          Actions
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCall}
            disabled={callLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {callLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            {callLoading ? 'Triggering...' : 'Trigger Call'}
          </button>

          <button
            type="button"
            onClick={handleSequenceToggle}
            disabled={seqLoading || !lead.sequence_name}
            title={!lead.sequence_name ? 'No active sequence' : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gold/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {seqLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : paused ? (
              <Play className="h-4 w-4 text-green-400" />
            ) : (
              <Pause className="h-4 w-4 text-yellow-400" />
            )}
            {seqLoading
              ? 'Updating...'
              : paused
                ? 'Resume Sequence'
                : 'Pause Sequence'}
          </button>
        </div>
        {lead.sequence_name && (
          <p className="mt-3 text-[11px] text-gray-500">
            Active sequence:{' '}
            <span className="text-gray-300">{lead.sequence_name}</span>
          </p>
        )}
      </section>

      {/* NOTES */}
      <section className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500">
          <FileText className="h-3 w-3" />
          Notes
        </h3>

        {lead.notes ? (
          <p className="mb-4 whitespace-pre-wrap rounded-md border border-dark-tertiary bg-dark-bg p-3 text-sm italic text-gray-400">
            {lead.notes}
          </p>
        ) : (
          <p className="mb-4 text-xs italic text-gray-600">No notes saved yet.</p>
        )}

        <form onSubmit={handleSaveNote} className="space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note (replaces current note)..."
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-600">
              {noteDraft.length}/1000
            </span>
            <button
              type="submit"
              disabled={noteSaving || !noteDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {noteSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save Note
            </button>
          </div>
        </form>
      </section>
    </aside>
  );
}
