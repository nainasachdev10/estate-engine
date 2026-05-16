'use client';

import { useMemo, useState, useTransition } from 'react';

export type LeadRow = {
  id: string;
  full_name: string;
  source: string | null;
  status: LeadStatus;
  score: number;
  last_contacted_at: string | null;
  project_name: string | null;
};

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

const STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'site_visit_booked',
  'visited',
  'negotiating',
  'closed_won',
  'closed_lost',
  'unresponsive',
];

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_booked: 'Site Visit',
  visited: 'Visited',
  negotiating: 'Negotiating',
  closed_won: 'Won',
  closed_lost: 'Lost',
  unresponsive: 'Unresponsive',
};

type FilterTab = 'all' | 'new' | 'contacted' | 'qualified' | 'site_visit' | 'closed';

const FILTER_TABS: { key: FilterTab; label: string; match: (s: LeadStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'new', label: 'New', match: (s) => s === 'new' },
  { key: 'contacted', label: 'Contacted', match: (s) => s === 'contacted' },
  { key: 'qualified', label: 'Qualified', match: (s) => s === 'qualified' || s === 'negotiating' },
  { key: 'site_visit', label: 'Site Visit', match: (s) => s === 'site_visit_booked' || s === 'visited' },
  { key: 'closed', label: 'Won/Lost', match: (s) => s === 'closed_won' || s === 'closed_lost' },
];

function maskName(name: string): string {
  if (!name) return '—';
  return name
    .split(' ')
    .map((p) => (p.length > 2 ? `${p[0]}***` : p))
    .join(' ');
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const colors: Record<LeadStatus, string> = {
    new: 'border-blue-700/50 bg-blue-900/30 text-blue-300',
    contacted: 'border-yellow-700/50 bg-yellow-900/30 text-yellow-300',
    qualified: 'border-green-700/50 bg-green-900/30 text-green-300',
    site_visit_booked: 'border-purple-700/50 bg-purple-900/30 text-purple-300',
    visited: 'border-indigo-700/50 bg-indigo-900/30 text-indigo-300',
    negotiating: 'border-orange-700/50 bg-orange-900/30 text-orange-300',
    closed_won: 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300',
    closed_lost: 'border-red-700/50 bg-red-900/30 text-red-300',
    unresponsive: 'border-white/10 bg-white/[0.04] text-white/40',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${colors[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function scoreClass(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-white/40';
}

type Toast = { id: number; tone: 'success' | 'error'; message: string };

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto min-w-[240px] rounded-md border px-4 py-3 text-sm shadow-2xl backdrop-blur transition ${
            t.tone === 'success'
              ? 'border-emerald-600/40 bg-emerald-900/40 text-emerald-200'
              : 'border-red-600/40 bg-red-900/40 text-red-200'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function LeadsTable({
  initialLeads,
  pageSize = 50,
}: {
  initialLeads: LeadRow[];
  pageSize?: number;
}) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(pageSize);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function pushToast(tone: Toast['tone'], message: string) {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, tone, message }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3500);
  }

  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      site_visit: 0,
      closed: 0,
    };
    for (const l of leads) {
      for (const tab of FILTER_TABS) {
        if (tab.key !== 'all' && tab.match(l.status)) c[tab.key]++;
      }
    }
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.key === filter)!;
    const needle = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (!tab.match(l.status)) return false;
      if (!needle) return true;
      return (
        l.full_name.toLowerCase().includes(needle) ||
        (l.project_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [leads, filter, search]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  async function triggerCall(leadId: string) {
    if (busy[leadId]) return;
    setBusy((b) => ({ ...b, [leadId]: true }));
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast('error', data?.error ?? 'Could not trigger call');
      } else {
        pushToast('success', 'Voice agent dispatched');
      }
    } catch {
      pushToast('error', 'Network error — could not trigger call');
    } finally {
      setBusy((b) => ({ ...b, [leadId]: false }));
    }
  }

  async function updateStatus(leadId: string, status: LeadStatus) {
    const prev = leads.find((l) => l.id === leadId)?.status;
    if (prev === status) return;
    // optimistic
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // revert
        setLeads((cur) =>
          cur.map((l) => (l.id === leadId && prev ? { ...l, status: prev } : l))
        );
        pushToast('error', data?.error ?? 'Could not update status');
      } else {
        pushToast('success', `Status updated to ${STATUS_LABEL[status]}`);
      }
    } catch {
      setLeads((cur) =>
        cur.map((l) => (l.id === leadId && prev ? { ...l, status: prev } : l))
      );
      pushToast('error', 'Network error — status not saved');
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setFilter(tab.key);
                  setVisible(pageSize);
                });
              }}
              className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition ${
                isActive
                  ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37]'
                  : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-px font-mono text-[10px] ${
                  isActive ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-white/[0.06] text-white/50'
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(pageSize);
            }}
            placeholder="Search name or project…"
            className="w-64 rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-[#d4af37]/60 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-12 text-center text-sm text-white/50">
          No leads match this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-white/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Project</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-left font-medium">Last Contact</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((l) => (
                  <tr key={l.id} className="group transition hover:bg-[#d4af37]/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{maskName(l.full_name)}</td>
                    <td className="px-4 py-3 text-white/70">{l.project_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider text-white/40">
                      {l.source ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${scoreClass(l.score)}`}>
                      {l.score}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {l.last_contacted_at
                        ? new Date(l.last_contacted_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => triggerCall(l.id)}
                          disabled={!!busy[l.id]}
                          className="inline-flex items-center gap-1 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-medium text-[#d4af37] transition hover:bg-[#d4af37]/20 disabled:opacity-50"
                        >
                          <span aria-hidden>📞</span>
                          {busy[l.id] ? 'Calling…' : 'Call'}
                        </button>
                        <select
                          value={l.status}
                          onChange={(e) => updateStatus(l.id, e.target.value as LeadStatus)}
                          className="rounded-md border border-white/10 bg-[#0a0a0a] px-2 py-1 text-xs text-white/80 focus:border-[#d4af37]/60 focus:outline-none"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {STATUS_LABEL[opt]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>
          Showing {shown.length} of {filtered.length}
        </span>
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="rounded-md border border-white/10 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-[#d4af37]/40 hover:text-[#d4af37]"
          >
            Load {Math.min(pageSize, filtered.length - visible)} more
          </button>
        )}
      </div>

      <Toaster toasts={toasts} />
    </div>
  );
}
