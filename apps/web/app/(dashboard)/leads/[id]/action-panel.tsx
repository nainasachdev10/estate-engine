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

const STATUS_STYLE: Record<LeadStatus, { backgroundColor: string; color: string }> = {
  new: { backgroundColor: 'rgba(96,165,250,0.10)', color: '#93c5fd' },
  contacted: { backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24' },
  qualified: { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' },
  site_visit_booked: { backgroundColor: 'rgba(167,139,250,0.10)', color: '#c4b5fd' },
  visited: { backgroundColor: 'rgba(129,140,248,0.10)', color: '#a5b4fc' },
  negotiating: { backgroundColor: 'rgba(251,146,60,0.10)', color: '#fb923c' },
  closed_won: { backgroundColor: 'rgba(74,222,128,0.10)', color: '#4ade80' },
  closed_lost: { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' },
  unresponsive: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' },
};

function maskPhone(phone: string): string {
  // +919876543210 -> +91 98***43210
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)}***${phone.slice(-5)}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 65) return '#D4AF37';
  return '#6B7280';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 65) return '#D4AF37';
  return '#4B5563';
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
    <aside className="sticky top-6 space-y-5">
      {/* SCORE — hero */}
      <section
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          backgroundColor: '#0a0a0a',
          borderColor: 'rgba(212,175,55,0.18)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
          }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
          Lead Score
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="font-mono text-4xl font-black tabular-nums"
            style={{ color: scoreColor(lead.score) }}
          >
            {lead.score}
          </span>
          <span className="font-mono text-[13px] text-gray-600">/ 100</span>
        </div>
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, lead.score))}%`,
              backgroundColor: scoreBarColor(lead.score),
            }}
          />
        </div>
      </section>

      {/* LEAD INFO */}
      <section
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: '#090909',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Lead Info
        </h3>

        <div className="mb-4">
          <p className="text-[15px] font-bold text-white">{lead.full_name}</p>
          <p className="mt-1 font-mono text-[12px] text-gray-400">
            {maskPhone(lead.phone_e164)}
          </p>
          {lead.email && (
            <p className="mt-0.5 truncate text-[12px] text-gray-600">{lead.email}</p>
          )}
        </div>

        <div
          className="my-4 h-px"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        />

        <dl className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <dt className="font-bold uppercase tracking-[0.14em] text-gray-600 text-[10px]">
              Source
            </dt>
            <dd className="mt-1 capitalize text-gray-300">{lead.source}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-[0.14em] text-gray-600 text-[10px]">
              Language
            </dt>
            <dd className="mt-1 capitalize text-gray-300">{lead.language_pref}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-bold uppercase tracking-[0.14em] text-gray-600 text-[10px]">
              Created
            </dt>
            <dd className="mt-1 font-mono text-gray-300">
              {new Date(lead.created_at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
        </dl>
      </section>

      {/* STATUS */}
      <section
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: '#090909',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Status
        </h3>
        <div className="mb-4">
          <span
            className="inline-flex rounded-full px-3 py-1 text-[12px] font-bold capitalize"
            style={STATUS_STYLE[status]}
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
            className="w-full appearance-none rounded-xl border px-4 py-2.5 pr-10 text-[13px] text-white focus:outline-none disabled:opacity-60"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusSaving && (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
              style={{ color: '#D4AF37' }}
            />
          )}
        </div>
      </section>

      {/* ACTIONS */}
      <section
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: '#090909',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          Actions
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCall}
            disabled={callLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium text-gray-400 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            {seqLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : paused ? (
              <Play className="h-4 w-4" style={{ color: '#4ade80' }} />
            ) : (
              <Pause className="h-4 w-4" style={{ color: '#fbbf24' }} />
            )}
            {seqLoading
              ? 'Updating...'
              : paused
                ? 'Resume Sequence'
                : 'Pause Sequence'}
          </button>
        </div>
        {lead.sequence_name && (
          <p className="mt-3 text-[11px] text-gray-600">
            Active sequence:{' '}
            <span className="font-mono text-gray-400">{lead.sequence_name}</span>
          </p>
        )}
      </section>

      {/* NOTES */}
      <section
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: '#090909',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
          <FileText className="h-3 w-3" />
          Notes
        </h3>

        {lead.notes ? (
          <p
            className="mb-4 whitespace-pre-wrap rounded-xl border p-3 text-[13px] italic text-gray-400 leading-relaxed"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {lead.notes}
          </p>
        ) : (
          <p className="mb-4 text-[12px] italic text-gray-700">No notes saved yet.</p>
        )}

        <form onSubmit={handleSaveNote} className="space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note (replaces current note)..."
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-xl border px-4 py-2.5 text-[13px] text-white placeholder:text-gray-700 focus:outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-gray-700">
              {noteDraft.length}/1000
            </span>
            <button
              type="submit"
              disabled={noteSaving || !noteDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: '#D4AF37', color: '#000' }}
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
