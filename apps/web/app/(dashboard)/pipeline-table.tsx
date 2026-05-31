'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Search, Plus, Inbox, Loader2 } from 'lucide-react';
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

const STATUS_STYLE: Record<string, { backgroundColor: string; color: string }> = {
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

function scoreStyle(score: number): { backgroundColor: string; color: string } {
  if (score >= 80) return { backgroundColor: 'rgba(52,211,153,0.10)', color: '#4ade80' };
  if (score >= 65) return { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' };
  return { backgroundColor: 'rgba(255,255,255,0.05)', color: '#6B7280' };
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
    <div className="space-y-5">
      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-[13px] text-white placeholder:text-gray-700 transition-colors focus:outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            />
          </div>
          <Link
            href="/bulk-upload"
            className="inline-flex flex-none items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:opacity-85"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </div>

        <div
          className="flex flex-wrap items-center gap-1 rounded-xl border p-1"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.10em] transition-all"
                style={
                  active
                    ? { backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }
                    : { color: '#6B7280' }
                }
              >
                {tab.label}
                <span
                  className="ml-1.5 font-mono text-[10px]"
                  style={{ color: active ? 'rgba(212,175,55,0.7)' : '#4B5563' }}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border py-20 text-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.01)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{
              backgroundColor: 'rgba(212,175,55,0.05)',
              borderColor: 'rgba(212,175,55,0.18)',
              color: '#D4AF37',
            }}
          >
            <Inbox className="h-6 w-6" />
          </span>
          <p className="mt-2 text-[15px] font-bold text-white">
            {search || filter !== 'all' ? 'No leads match this filter.' : 'Your pipeline is ready.'}
          </p>
          <p className="max-w-sm text-[14px] text-gray-500 leading-relaxed">
            {search || filter !== 'all'
              ? 'Try clearing your search or switching tabs.'
              : 'New leads from Meta, 99acres, and Magicbricks will land here automatically — or add one manually.'}
          </p>
          {!search && filter === 'all' && (
            <Link
              href="/bulk-upload"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-all hover:opacity-85"
              style={{ backgroundColor: '#D4AF37', color: '#000' }}
            >
              <Plus className="h-4 w-4" />
              Add your first lead
            </Link>
          )}
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ backgroundColor: '#090909' }}>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Project
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Source
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Score
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Last Contact
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#090909' }}>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="cursor-pointer border-b transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <td className="px-5 py-4 text-[14px] font-bold text-white">
                      {maskName(lead.full_name)}
                    </td>
                    <td className="px-5 py-4 text-[14px] text-gray-400">
                      {lead.project_name ?? '—'}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-gray-600">
                      {lead.source}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
                        style={
                          STATUS_STYLE[lead.status] ?? {
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#6B7280',
                          }
                        }
                      >
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                        style={scoreStyle(lead.score)}
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-gray-500">
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
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerCall(lead.id, lead.full_name);
                        }}
                        disabled={callingId === lead.id}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: 'rgba(212,175,55,0.28)',
                          backgroundColor: 'rgba(212,175,55,0.10)',
                          color: '#D4AF37',
                        }}
                      >
                        {callingId === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Phone className="h-3 w-3" />
                        )}
                        {callingId === lead.id ? 'Calling...' : 'Call'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
