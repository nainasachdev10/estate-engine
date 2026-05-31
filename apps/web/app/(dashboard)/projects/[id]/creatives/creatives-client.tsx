'use client';

import { useState, useRef } from 'react';

interface Campaign {
  id: string;
  project_id: string;
  platform: string;
  name: string;
  status: string;
  headline: string | null;
  primary_text: string | null;
  external_campaign_id: string | null;
  created_at: string;
}

export default function CreativesClient({
  projectId,
  initialCampaigns,
}: {
  projectId: string;
  initialCampaigns: Campaign[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [launchBudget, setLaunchBudget] = useState<Record<string, string>>({});
  const [launchResult, setLaunchResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/creatives/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_SECRET ?? '',
        },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to generate');
        return;
      }
      // Prepend the new rows
      setCampaigns([...(data.campaigns ?? []), ...campaigns]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(c: Campaign) {
    const text = `${c.name} | ${c.platform}\n${c.headline ?? ''}\n${c.primary_text ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* noop */
    }
  }

  async function toggleLaunched(c: Campaign) {
    const newStatus = c.status === 'active' ? 'draft' : 'active';
    const res = await fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setCampaigns(campaigns.map((x) => (x.id === c.id ? { ...x, status: newStatus } : x)));
    }
  }

  async function launchOnMeta(c: Campaign) {
    const budgetRupees = parseFloat(launchBudget[c.id] ?? '500');
    const budgetPaise = Math.round(budgetRupees * 100);
    setLaunchingId(c.id);
    setLaunchResult((prev) => { const n = { ...prev }; delete n[c.id]; return n; });
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: c.id, dailyBudgetPaise: budgetPaise }),
      });
      const data = await res.json();
      if (res.ok) {
        setCampaigns(campaigns.map((x) =>
          x.id === c.id ? { ...x, status: 'active', external_campaign_id: data.metaCampaignId } : x
        ));
        setLaunchResult((prev) => ({ ...prev, [c.id]: { ok: true, msg: `Created on Meta (PAUSED) · ID: ${data.metaCampaignId?.slice(0, 10)}` } }));
      } else {
        setLaunchResult((prev) => ({ ...prev, [c.id]: { ok: false, msg: data.error ?? 'Launch failed' } }));
      }
    } catch {
      setLaunchResult((prev) => ({ ...prev, [c.id]: { ok: false, msg: 'Network error' } }));
    } finally {
      setLaunchingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          {generating ? 'Generating with Claude…' : 'Generate 10 Creatives'}
        </button>
        {error && (
          <span
            className="rounded-xl border px-3 py-1.5 text-[12px] text-red-400"
            style={{ borderColor: 'rgba(239,68,68,0.20)', backgroundColor: 'rgba(239,68,68,0.05)' }}
          >
            {error}
          </span>
        )}
        <span className="ml-auto text-[12px] font-medium text-gray-600">
          {campaigns.length} creative{campaigns.length === 1 ? '' : 's'} on file
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border py-20 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-lg font-bold text-white">No creatives yet</p>
          <p className="text-[13px] text-gray-500">
            Click <span style={{ color: '#D4AF37' }}>Generate 10 Creatives</span> to spin up Claude.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.13)]"
              style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={c.platform} />
                  <span className="text-[11px] font-medium text-gray-500">{c.name}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {c.headline && (
                <p className="mb-2 text-[14px] font-semibold leading-snug text-white">{c.headline}</p>
              )}
              {c.primary_text && (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-500">
                  {c.primary_text}
                </p>
              )}

              <div
                className="mt-5 pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(c)}
                    className="rounded-xl border px-3 py-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:text-white"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                  >
                    {copiedId === c.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => toggleLaunched(c)}
                    className="rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors"
                    style={
                      c.status === 'active'
                        ? { borderColor: 'rgba(52,211,153,0.20)', backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
                        : { borderColor: 'rgba(212,175,55,0.28)', backgroundColor: 'rgba(212,175,55,0.10)', color: '#D4AF37' }
                    }
                  >
                    {c.status === 'active' ? '✓ Live' : 'Mark live'}
                  </button>
                  {c.platform === 'meta' && !c.external_campaign_id && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="number"
                        min="100"
                        step="100"
                        value={launchBudget[c.id] ?? '500'}
                        onChange={(e) => setLaunchBudget((p) => ({ ...p, [c.id]: e.target.value }))}
                        title="Daily budget in ₹"
                        className="w-20 rounded-xl border px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
                      />
                      <span className="text-[11px] text-gray-600">₹/day</span>
                      <button
                        onClick={() => launchOnMeta(c)}
                        disabled={launchingId === c.id}
                        className="rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                        style={{ borderColor: 'rgba(59,130,246,0.20)', backgroundColor: 'rgba(59,130,246,0.10)', color: '#93c5fd' }}
                      >
                        {launchingId === c.id ? 'Launching…' : 'Launch on Meta'}
                      </button>
                    </div>
                  )}
                </div>
                {c.external_campaign_id && (
                  <p className="mt-2 font-mono text-[11px] text-gray-600">Meta ID: {c.external_campaign_id.slice(0, 12)}…</p>
                )}
                {launchResult[c.id] && (
                  <p
                    className="mt-2 text-[12px]"
                    style={{ color: launchResult[c.id].ok ? '#34d399' : '#fca5a5' }}
                  >
                    {launchResult[c.id].msg}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    meta: { bg: 'rgba(59,130,246,0.10)', color: '#93c5fd', label: 'Meta' },
    google: { bg: 'rgba(251,191,36,0.10)', color: '#fcd34d', label: 'Google' },
    '99acres': { bg: 'rgba(168,85,247,0.10)', color: '#d8b4fe', label: '99acres' },
  };
  const cfg = map[platform] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9CA3AF', label: platform };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'rgba(255,255,255,0.06)', color: '#9CA3AF' },
    active: { bg: 'rgba(52,211,153,0.10)', color: '#34d399' },
    paused: { bg: 'rgba(251,191,36,0.10)', color: '#fcd34d' },
    ended: { bg: 'rgba(239,68,68,0.10)', color: '#fca5a5' },
  };
  const cfg = map[status] ?? { bg: 'rgba(255,255,255,0.06)', color: '#9CA3AF' };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {status}
    </span>
  );
}
