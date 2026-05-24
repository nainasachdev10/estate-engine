'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Loader2 } from 'lucide-react';
import { useToast } from '../../components/toast-provider';

export interface KanbanLead {
  id: string;
  full_name: string;
  status: string;
  score: number;
  project_name: string | null;
  created_at: string;
}

interface Column {
  key: string;
  label: string;
  dot: string;
  text: string;
}

const COLUMNS: Column[] = [
  { key: 'new', label: 'New', dot: 'bg-blue-400', text: 'text-blue-300' },
  { key: 'contacted', label: 'Contacted', dot: 'bg-amber-400', text: 'text-amber-300' },
  { key: 'qualified', label: 'Qualified', dot: 'bg-green-400', text: 'text-green-300' },
  { key: 'site_visit_booked', label: 'Site Visit Booked', dot: 'bg-purple-400', text: 'text-purple-300' },
  { key: 'visited', label: 'Visited', dot: 'bg-indigo-400', text: 'text-indigo-300' },
  { key: 'negotiating', label: 'Negotiating', dot: 'bg-orange-400', text: 'text-orange-300' },
  { key: 'closed_won', label: 'Closed Won', dot: 'bg-emerald-400', text: 'text-emerald-300' },
];

function maskName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p.length > 2 ? `${p[0]}***` : p))
    .join(' ');
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

function scoreClass(score: number): string {
  if (score >= 70) return 'bg-green-900/50 text-green-300 ring-green-500/20';
  if (score >= 40) return 'bg-yellow-900/50 text-yellow-300 ring-yellow-500/20';
  return 'bg-gray-800/80 text-gray-400 ring-gray-600/30';
}

function LeadCard({
  lead,
  calling,
  onCall,
  onOpen,
}: {
  lead: KanbanLead;
  calling: boolean;
  onCall: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group cursor-pointer rounded-lg border border-dark-tertiary bg-dark-bg p-3 transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-white">
          {maskName(lead.full_name)}
        </p>
        <span
          className={`flex-none rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset ${scoreClass(lead.score)}`}
        >
          {lead.score}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-gray-500">
        {lead.project_name ?? 'No project'}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-600">
          {timeAgo(lead.created_at)}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCall(); }}
          disabled={calling}
          className="inline-flex items-center gap-1 rounded border border-dark-tertiary bg-dark-secondary px-2 py-1 text-[11px] font-medium text-gold transition-colors hover:border-gold/40 hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {calling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
          {calling ? '...' : 'Call'}
        </button>
      </div>
    </div>
  );
}

export default function KanbanBoard({ leads }: { leads: KanbanLead[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [callingId, setCallingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  async function triggerCall(lead: KanbanLead) {
    setCallingId(lead.id);
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error ?? `Could not call ${maskName(lead.full_name)}`);
      } else {
        toast.success(`Call queued for ${maskName(lead.full_name)}`);
        startTransition(() => router.refresh());
      }
    } catch {
      toast.error('Network error — could not trigger call');
    } finally {
      setCallingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            className="flex flex-col rounded-xl border border-dark-tertiary bg-dark-secondary/40"
          >
            <div className="flex items-center justify-between border-b border-dark-tertiary px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${col.text}`}>
                  {col.label}
                </h3>
              </div>
              <span className="rounded-full bg-dark-bg px-2 py-0.5 font-mono text-[11px] text-gray-400">
                {colLeads.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 p-3">
              {colLeads.length === 0 ? (
                <p className="px-2 py-6 text-center text-[11px] text-gray-600">
                  No leads here
                </p>
              ) : (
                colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    calling={callingId === lead.id}
                    onCall={() => triggerCall(lead)}
                    onOpen={() => router.push(`/leads/${lead.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
