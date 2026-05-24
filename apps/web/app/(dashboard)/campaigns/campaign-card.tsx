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
  projects: { id: string; name: string } | null;
};

const PLATFORM_STYLE: Record<string, string> = {
  meta: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  google: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  '99acres': 'border-purple-500/40 bg-purple-500/10 text-purple-300',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-700/60 text-gray-300',
  active: 'bg-emerald-900/60 text-emerald-300',
  paused: 'bg-yellow-900/60 text-yellow-300',
  ended: 'bg-red-900/60 text-red-300',
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

  return (
    <div className="flex flex-col rounded-xl border border-dark-tertiary bg-dark-secondary p-5 transition-colors hover:border-gold/30">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
              PLATFORM_STYLE[campaign.platform] ?? 'border-gray-600 bg-gray-800 text-gray-300'
            }`}
          >
            {campaign.platform}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              STATUS_STYLE[status] ?? 'bg-gray-700 text-gray-300'
            }`}
          >
            {status}
          </span>
        </div>
        {campaign.projects && (
          <Link
            href={`/projects/${campaign.projects.id}/creatives`}
            className="truncate text-right text-xs text-gray-400 transition-colors hover:text-gold"
          >
            {campaign.projects.name}
          </Link>
        )}
      </div>

      {campaign.headline && (
        <p className="mb-2 text-base font-semibold leading-snug text-gold">
          {campaign.headline}
        </p>
      )}
      {campaign.primary_text && (
        <p
          className="mb-4 text-sm leading-relaxed text-gray-300"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {campaign.primary_text}
        </p>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-dark-tertiary pt-3 text-xs text-gray-400">
        <span>
          <span className="font-mono text-gray-200">{fmtRupees(campaign.budget_paise_daily)}</span>
          <span className="text-gray-600">/day</span>
        </span>
        <span>
          <span className="font-mono text-gold">{campaign.leads_count ?? 0}</span> leads
        </span>
        <span className="ml-auto text-gray-500">
          {campaign.started_at
            ? new Date(campaign.started_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
            : 'Not started'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={copyText}
          className="rounded-md border border-dark-tertiary px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
        >
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button
          onClick={toggleLive}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            status === 'active'
              ? 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900'
              : 'bg-dark-tertiary text-gold hover:bg-dark-tertiary/70'
          }`}
        >
          {status === 'active' ? '✓ Live' : 'Mark Live'}
        </button>
        {campaign.platform === 'meta' && !externalId && (
          <button
            onClick={launchMeta}
            disabled={launching}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {launching && (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {launching ? 'Launching…' : '🚀 Launch on Meta'}
          </button>
        )}
        {externalId && (
          <span className="ml-auto truncate text-[11px] text-gray-500">
            Meta ID: {externalId.slice(0, 12)}…
          </span>
        )}
      </div>
    </div>
  );
}
