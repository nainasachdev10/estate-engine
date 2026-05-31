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
}

const COLUMNS: Column[] = [
  { key: 'new', label: 'New', dot: '#60a5fa' },
  { key: 'contacted', label: 'Contacted', dot: '#fbbf24' },
  { key: 'qualified', label: 'Qualified', dot: '#34d399' },
  { key: 'site_visit_booked', label: 'Site Visit Booked', dot: '#c4b5fd' },
  { key: 'visited', label: 'Visited', dot: '#a5b4fc' },
  { key: 'negotiating', label: 'Negotiating', dot: '#fb923c' },
  { key: 'closed_won', label: 'Closed Won', dot: '#4ade80' },
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

function scoreStyle(score: number): { backgroundColor: string; color: string } {
  if (score >= 80) return { backgroundColor: 'rgba(52,211,153,0.10)', color: '#4ade80' };
  if (score >= 65) return { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' };
  return { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' };
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
      className="group cursor-pointer rounded-xl border p-3 transition-all duration-150 hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-0.5"
      style={{
        backgroundColor: '#0c0c0c',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[13px] font-bold text-white">
          {maskName(lead.full_name)}
        </p>
        <span
          className="flex-none rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
          style={scoreStyle(lead.score)}
        >
          {lead.score}
        </span>
      </div>
      <p className="mt-1 truncate text-[12px] text-gray-500">
        {lead.project_name ?? 'No project'}
      </p>
      <div
        className="my-3 h-px"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
          {timeAgo(lead.created_at)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          disabled={calling}
          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: 'rgba(212,175,55,0.28)',
            backgroundColor: 'rgba(212,175,55,0.10)',
            color: '#D4AF37',
          }}
        >
          {calling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Phone className="h-3 w-3" />
          )}
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            className="flex h-full flex-col rounded-2xl border"
            style={{
              backgroundColor: '#070707',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: col.dot }}
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  {col.label}
                </span>
              </div>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-gray-600"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                {colLeads.length}
              </span>
            </div>

            <div className="flex min-h-[200px] flex-col gap-2.5 p-3">
              {colLeads.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-2 py-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-700">
                    Empty
                  </p>
                </div>
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
