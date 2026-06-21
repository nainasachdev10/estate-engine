'use client';

import { useState, useCallback } from 'react';
import { CreativeCard, type Campaign, type MediaRow } from './creative-card';

// Concurrency-limited Promise.all — processes `items` in batches of `limit`
async function pLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let i = 0;
  async function runNext(): Promise<void> {
    if (i >= items.length) return;
    const idx = i++;
    await fn(items[idx], idx);
    await runNext();
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
}

export default function CreativesClient({
  projectId,
  initialCampaigns,
}: {
  projectId: string;
  initialCampaigns: Campaign[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaRow[]>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Generate All" state
  const [allRunning, setAllRunning] = useState(false);
  const [allProgress, setAllProgress] = useState<string | null>(null);

  const handleMediaUpdate = useCallback((id: string, rows: MediaRow[]) => {
    setMediaMap((prev) => ({ ...prev, [id]: rows }));
  }, []);

  const handleStatusChange = useCallback(
    (id: string, status: string, externalId?: string) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status, ...(externalId ? { external_campaign_id: externalId } : {}) }
            : c,
        ),
      );
    },
    [],
  );

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
      setCampaigns([...(data.campaigns ?? []), ...campaigns]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateAll() {
    if (campaigns.length === 0) return;
    setAllRunning(true);
    setAllProgress(null);

    const total = campaigns.length;
    let imgDone = 0;

    // Phase 1: generate images with concurrency limit of 2
    setAllProgress(`Generating 0 of ${total} images…`);
    await pLimit(campaigns, 2, async (c) => {
      try {
        await fetch('/api/creatives/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creativeId: c.id }),
        });
      } catch {
        // individual failures are non-fatal for the batch
      }
      imgDone++;
      setAllProgress(`Generating ${imgDone} of ${total} images…`);
    });

    // Refetch all media after images
    const allMedia = await Promise.all(
      campaigns.map(async (c) => {
        try {
          const res = await fetch(`/api/creatives/media?creativeId=${c.id}`);
          if (res.ok) {
            const data = await res.json();
            return { id: c.id, rows: (data.media ?? []) as MediaRow[] };
          }
        } catch {
          // noop
        }
        return { id: c.id, rows: [] as MediaRow[] };
      }),
    );
    const updatedMap: Record<string, MediaRow[]> = {};
    for (const { id, rows } of allMedia) updatedMap[id] = rows;
    setMediaMap((prev) => ({ ...prev, ...updatedMap }));

    // Phase 2: generate videos with concurrency limit of 2
    let vidDone = 0;
    setAllProgress(`Generating 0 of ${total} videos…`);
    await pLimit(campaigns, 2, async (c) => {
      const imageRow = updatedMap[c.id]?.find((m) => m.type === 'image' && m.status === 'ready');
      try {
        await fetch('/api/creatives/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creativeId: c.id, imageUrl: imageRow?.url }),
        });
      } catch {
        // individual failures are non-fatal
      }
      vidDone++;
      setAllProgress(`Generating ${vidDone} of ${total} videos…`);
    });

    // Final refetch for videos
    const finalMedia = await Promise.all(
      campaigns.map(async (c) => {
        try {
          const res = await fetch(`/api/creatives/media?creativeId=${c.id}`);
          if (res.ok) {
            const data = await res.json();
            return { id: c.id, rows: (data.media ?? []) as MediaRow[] };
          }
        } catch {
          // noop
        }
        return { id: c.id, rows: updatedMap[c.id] ?? [] };
      }),
    );
    const finalMap: Record<string, MediaRow[]> = {};
    for (const { id, rows } of finalMedia) finalMap[id] = rows;
    setMediaMap((prev) => ({ ...prev, ...finalMap }));

    setAllProgress('Done — all creatives generated.');
    setAllRunning(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating || allRunning}
          className="rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          {generating ? 'Generating with Claude…' : 'Generate 10 Creatives'}
        </button>

        <button
          onClick={handleGenerateAll}
          disabled={allRunning || campaigns.length === 0 || generating}
          className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-bold transition-colors disabled:opacity-50"
          style={{
            borderColor: 'rgba(212,175,55,0.30)',
            backgroundColor: allRunning ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.06)',
            color: '#D4AF37',
          }}
        >
          {allRunning ? (
            <>
              <SpinnerSm />
              {allProgress ?? 'Running…'}
            </>
          ) : (
            'Generate All Creatives'
          )}
        </button>

        {!allRunning && allProgress && (
          <span className="text-[12px] font-medium" style={{ color: '#34d399' }}>
            {allProgress}
          </span>
        )}

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
            <CreativeCard
              key={c.id}
              campaign={c}
              media={mediaMap[c.id] ?? []}
              onStatusChange={handleStatusChange}
              onMediaUpdate={handleMediaUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpinnerSm() {
  return (
    <svg
      className="animate-spin"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
