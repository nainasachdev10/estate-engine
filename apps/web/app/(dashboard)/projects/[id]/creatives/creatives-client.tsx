'use client';

import { useState } from 'react';

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

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/creatives/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch('/api/campaigns/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: c.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setCampaigns(campaigns.map((x) => (x.id === c.id ? { ...x, status: 'active', external_campaign_id: data.metaCampaignId } : x)));
      alert(`✅ Campaign created on Meta (PAUSED). Review in Meta Ads Manager before going live.\nCampaign ID: ${data.metaCampaignId}`);
    } else {
      alert(`❌ Meta launch failed: ${data.error}`);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-dark-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? 'Generating with Claude…' : 'Generate 10 Creatives'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
        <span className="ml-auto text-xs text-gray-500">
          {campaigns.length} creative{campaigns.length === 1 ? '' : 's'} on file
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center">
          <p className="text-gray-400">No creatives yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Click <span className="text-gold">Generate 10 Creatives</span> to spin up Claude.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-dark-tertiary bg-dark-secondary p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={c.platform} />
                  <span className="text-xs text-gray-400">{c.name}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {c.headline && (
                <p className="mb-2 font-semibold text-gold leading-snug">{c.headline}</p>
              )}
              {c.primary_text && (
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {c.primary_text}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(c)}
                  className="rounded border border-dark-tertiary px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-tertiary"
                >
                  {copiedId === c.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => toggleLaunched(c)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    c.status === 'active'
                      ? 'bg-green-900 text-green-300 hover:bg-green-800'
                      : 'bg-dark-tertiary text-gold hover:bg-dark-tertiary/80'
                  }`}
                >
                  {c.status === 'active' ? '✓ Live' : 'Mark live'}
                </button>
                {c.platform === 'meta' && !c.external_campaign_id && (
                  <button
                    onClick={() => launchOnMeta(c)}
                    className="rounded bg-blue-900 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-800 transition"
                  >
                    🚀 Launch on Meta
                  </button>
                )}
                {c.external_campaign_id && (
                  <span className="text-xs text-gray-500">Meta ID: {c.external_campaign_id.slice(0, 12)}…</span>
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
  const map: Record<string, string> = {
    meta: 'bg-blue-900 text-blue-300',
    google: 'bg-yellow-900 text-yellow-300',
    '99acres': 'bg-purple-900 text-purple-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[platform] ?? 'bg-gray-800 text-gray-400'}`}>
      {platform}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-800 text-gray-400',
    active: 'bg-green-900 text-green-300',
    paused: 'bg-yellow-900 text-yellow-300',
    ended: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}
