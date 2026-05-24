'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Search, Plus, Inbox } from 'lucide-react';
import { useToast } from '../components/toast-provider';

export interface PipelineLead {
  id: string;
  full_name: string;
  source: string;
  status: string;
  score: number;
  last_contacted_at: string | null;
  project_name: string | null;
}

type FilterKey = 'all' | 'new' | 'contacted' | 'qualified' | 'site_visit' | 'negotiating';

const FILTER_TABS: { key: FilterKey; label: string; matches: string[] }[] = [
  { key: 'all', label: 'All', matches: [] },
  { key: 'new', label: 'New', matches: ['new'] },
  { key: 'contacted', label: 'Contacted', matches: ['contacted'] },
  { key: 'qualified', label: 'Qualified', matches: ['qualified'] },
  { key: 'site_visit', label: 'Site Visit', matches: ['site_visit_booked', 'visited'] },
  { key: 'negotiating', label: 'Negotiating', matches: ['negotiating'] },
];

function maskName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p.length > 2 ? `${p[0]}***` : p))
    .join(' ');
}

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-900/60 text-blue-300 ring-1 ring-inset ring-blue-500/20',
  contacted: 'bg-yellow-900/60 text-yellow-300 ring-1 ring-inset ring-yellow-500/20',
  qualified: 'bg-green-900/60 text-green-300 ring-1 ring-inset ring-green-500/20',
  site_visit_booked: 'bg-purple-900/60 text-purple-300 ring-1 ring-inset ring-purple-500/20',
  visited: 'bg-indigo-900/60 text-indigo-300 ring-1 ring-inset ring-indigo-500/20',
  negotiating: 'bg-orange-900/60 text-orange-300 ring-1 ring-inset ring-orange-500/20',
  closed_won: 'bg-emerald-900/60 text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
  closed_lost: 'bg-red-900/60 text-red-300 ring-1 ring-inset ring-red-500/20',
  unresponsive: 'bg-gray-800/80 text-gray-400 ring-1 ring-inset ring-gray-600/30',
};

function scoreClass(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-gray-500';
}

export default function PipelineTable({ leads }: { leads: PipelineLead[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [callingId, setCallingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Auto-refresh every 30s via router.refresh() so server-side data stays fresh
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tab = FILTER_TABS.find((t) => t.key === filter);
    return leads.filter((l) => {
      if (q && !l.full_name.toLowerCase().includes(q)) return false;
      if (tab && tab.matches.length > 0 && !tab.matches.includes(l.status)) return false;
      return true;
    });
  }, [leads, search, filter]);

  // Per-tab counts (informational; uses unfiltered base for accuracy)
  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      site_visit: 0,
      negotiating: 0,
    };
    for (const l of leads) {
      for (const tab of FILTER_TABS) {
        if (tab.key === 'all') continue;
        if (tab.matches.includes(l.status)) map[tab.key] += 1;
      }
    }
    return map;
  }, [leads]);

  async function triggerCall(leadId: string, leadName: string) {
    setCallingId(leadId);
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error ?? `Could not call ${maskName(leadName)}`);
      } else {
        toast.success(`Call queued for ${maskName(leadName)}`);
        startTransition(() => router.refresh());
      }
    } catch {
      toast.error('Network error — could not trigger call');
    } finally {
      setCallingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full rounded-md border border-dark-tertiary bg-dark-secondary py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>
          <Link
            href="/bulk-upload"
            className="inline-flex flex-none items-center gap-1.5 rounded-md bg-gradient-gold px-3 py-2 text-xs font-semibold text-dark-bg transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-md border border-dark-tertiary bg-dark-secondary p-1">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors
                  ${active
                    ? 'bg-gold/10 text-gold ring-1 ring-inset ring-gold/30'
                    : 'text-gray-400 hover:bg-dark-tertiary hover:text-white'}`}
              >
                {tab.label}
                <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-gold/70' : 'text-gray-600'}`}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-dark-tertiary bg-dark-secondary/40 p-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold">
            <Inbox className="h-6 w-6" />
          </span>
          <p className="mt-5 text-base font-medium text-gray-200">
            {search || filter !== 'all' ? 'No leads match this filter.' : 'Your pipeline is ready.'}
          </p>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            {search || filter !== 'all'
              ? 'Try clearing your search or switching tabs.'
              : 'New leads from Meta, 99acres, and Magicbricks will land here automatically — or add one manually.'}
          </p>
          {!search && filter === 'all' && (
            <Link
              href="/bulk-upload"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-gradient-gold px-4 py-2 text-xs font-semibold text-dark-bg transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add your first lead
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dark-tertiary">
          <table className="w-full text-sm">
            <thead className="bg-dark-secondary text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Last Contact</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-tertiary bg-dark-secondary/40">
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="cursor-pointer transition-colors hover:bg-dark-tertiary/40 hover:shadow-[inset_2px_0_0_0_#d4af37]"
                >
                  <td className="px-4 py-3 font-medium text-white">{maskName(lead.full_name)}</td>
                  <td className="px-4 py-3 text-gray-300">{lead.project_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">
                    {lead.source}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_BADGE[lead.status] ?? 'bg-gray-800 text-gray-400'}`}
                    >
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-sm ${scoreClass(lead.score)}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerCall(lead.id, lead.full_name);
                      }}
                      disabled={callingId === lead.id}
                      className="inline-flex items-center gap-1 rounded border border-dark-tertiary bg-dark-bg px-2 py-1 text-xs font-medium text-gold transition-colors hover:border-gold/40 hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Phone className="h-3 w-3" />
                      {callingId === lead.id ? 'Calling...' : 'Call'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
