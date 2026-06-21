'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '../../components/toast-provider';

export type Campaign = {
  id: string;
  project_id: string;
  platform: string;
  name: string;
  status: string;
  headline: string | null;
  primary_text: string | null;
  budget_paise_daily: number | null;
  leads_count: number;
  started_at: string | null;
  external_campaign_id: string | null;
  lead_form_id: string | null;
  projects: { id: string; name: string } | null;
};

const PLATFORM_STYLE: Record<string, string> = {
  meta: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  google: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  '99acres': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-white/[0.06] text-gray-400',
  active: 'bg-emerald-500/10 text-emerald-300',
  paused: 'bg-amber-500/10 text-amber-300',
  ended: 'bg-red-500/10 text-red-300',
};

function fmtRupees(paise: number | null): string {
  if (!paise) return '—';
  if (paise >= 10_000_000) return `₹${(paise / 10_000_000).toFixed(1)} Cr`;
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)} L`;
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(campaign.status);
  const [externalId, setExternalId] = useState(campaign.external_campaign_id);
  const [launching, setLaunching] = useState(false);
  const [leadFormId, setLeadFormId] = useState(campaign.lead_form_id ?? '');
  const [savingFormId, setSavingFormId] = useState(false);
  const [, startTransition] = useTransition();

  async function copyText() {
    const text = [
      `${campaign.name} · ${campaign.platform}`,
      campaign.headline ?? '',
      campaign.primary_text ?? '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Ad copy copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  async function toggleLive() {
    const next = status === 'active' ? 'draft' : 'active';
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Could not update status');
        return;
      }
      toast.success(next === 'active' ? 'Marked live' : 'Set to draft');
      startTransition(() => router.refresh());
    } catch {
      setStatus(prev);
      toast.error('Network error');
    }
  }

  async function launchMeta() {
    setLaunching(true);
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Meta launch failed');
        return;
      }
      setStatus('active');
      setExternalId(data.metaCampaignId ?? 'pending');
      toast.success('Created on Meta (paused) — review in Ads Manager');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Network error launching on Meta');
    } finally {
      setLaunching(false);
    }
  }

  async function saveLeadFormId() {
    const value = leadFormId.trim() || null;
    if (value === (campaign.lead_form_id ?? null)) return;
    setSavingFormId(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_form_id: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Could not save lead form ID');
        return;
      }
      toast.success('Lead form ID saved');
    } catch {
      toast.error('Network error');
    } finally {
      setSavingFormId(false);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:border-[rgba(255,255,255,0.13)]"
      style={{
        backgroundColor: '#090909',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              PLATFORM_STYLE[campaign.platform] ?? 'border-white/10 bg-white/[0.04] text-gray-300'
            }`}
          >
            {campaign.platform}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              STATUS_STYLE[status] ?? 'bg-white/[0.06] text-gray-400'
            }`}
          >
            {status}
          </span>
        </div>
        {campaign.projects && (
          <Link
            href={`/projects/${campaign.projects.id}/creatives`}
            className="truncate text-right text-[12px] text-gray-500 transition-colors hover:text-white"
          >
            {campaign.projects.name}
          </Link>
        )}
      </div>

      <div
        className="mb-4 flex flex-col gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: '#060606',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {campaign.headline && (
          <p
            className="text-[15px] font-bold leading-snug"
            style={{ color: '#D4AF37' }}
          >
            {campaign.headline}
          </p>
        )}
        {campaign.primary_text && (
          <p
            className="text-[13px] leading-relaxed text-gray-400"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {campaign.primary_text}
          </p>
        )}
        {!campaign.headline && !campaign.primary_text && (
          <p className="text-[13px] italic text-gray-600">No ad copy yet.</p>
        )}
      </div>

      <div
        className="mb-4 grid grid-cols-3 gap-3 rounded-xl border p-3"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
            Budget
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-bold text-white">
            {fmtRupees(campaign.budget_paise_daily)}
            <span className="ml-0.5 text-[10px] font-normal text-gray-600">/d</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
            Leads
          </p>
          <p
            className="mt-0.5 font-mono text-[13px] font-bold"
            style={{ color: '#D4AF37' }}
          >
            {campaign.leads_count ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
            Started
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-gray-300">
            {campaign.started_at
              ? new Date(campaign.started_at).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'short',
                })
              : '—'}
          </p>
        </div>
      </div>

      <div
        className="mt-auto flex flex-wrap items-center gap-2 border-t pt-4"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={copyText}
          className="rounded-xl border px-3 py-1.5 text-[12px] font-medium text-gray-300 transition-colors hover:text-white"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button
          onClick={toggleLive}
          className="rounded-xl px-3 py-1.5 text-[12px] font-bold transition-colors"
          style={
            status === 'active'
              ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
              : { backgroundColor: '#D4AF37', color: '#000' }
          }
        >
          {status === 'active' ? '✓ Live' : 'Mark Live'}
        </button>
        {campaign.platform === 'meta' && !externalId && (
          <button
            onClick={launchMeta}
            disabled={launching}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(59,130,246,0.85)' }}
          >
            {launching && (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {launching ? 'Launching…' : 'Launch on Meta'}
          </button>
        )}
        {externalId && (
          <span className="ml-auto truncate font-mono text-[11px] text-gray-500">
            ID: {externalId.slice(0, 12)}…
          </span>
        )}
      </div>
      {campaign.platform === 'meta' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
            Lead form ID
          </span>
          <input
            value={leadFormId}
            onChange={(e) => setLeadFormId(e.target.value)}
            onBlur={saveLeadFormId}
            placeholder="Meta Lead Ads form ID"
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-2.5 py-1 font-mono text-[11px] text-gray-300 outline-none focus:border-[#D4AF37]"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          />
          {savingFormId && (
            <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
