'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

export interface Campaign {
  id: string;
  project_id: string;
  platform: string;
  name: string;
  status: string;
  headline: string | null;
  primary_text: string | null;
  external_campaign_id: string | null;
  created_at: string;
  image_asset_id: string | null;
  video_asset_id: string | null;
}

export interface MediaRow {
  id: string;
  type: 'image' | 'video';
  url: string;
  status: string;
}

interface CreativeCardProps {
  campaign: Campaign;
  onStatusChange: (id: string, status: string, externalId?: string) => void;
  /** Pre-loaded media for this creative */
  media: MediaRow[];
  onMediaUpdate: (id: string, rows: MediaRow[]) => void;
}

export function CreativeCard({ campaign: c, onStatusChange, media, onMediaUpdate }: CreativeCardProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [launchBudget, setLaunchBudget] = useState('500');
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [imgGenerating, setImgGenerating] = useState(false);
  const [vidGenerating, setVidGenerating] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const imageMedia = media.find((m) => m.type === 'image' && m.status === 'ready');
  const videoMedia = media.find((m) => m.type === 'video' && m.status === 'ready');

  const refetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/creatives/media?creativeId=${c.id}`);
      if (res.ok) {
        const data = await res.json();
        onMediaUpdate(c.id, data.media ?? []);
      }
    } catch {
      // non-fatal — UI stays stale
    }
  }, [c.id, onMediaUpdate]);

  async function generateImage() {
    setImgGenerating(true);
    setMediaError(null);
    try {
      const res = await fetch('/api/creatives/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMediaError(data?.error ?? 'Image generation failed');
        return;
      }
      await refetchMedia();
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setImgGenerating(false);
    }
  }

  async function generateVideo() {
    setVidGenerating(true);
    setMediaError(null);
    try {
      const res = await fetch('/api/creatives/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeId: c.id, imageUrl: imageMedia?.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMediaError(data?.error ?? 'Video generation failed');
        return;
      }
      await refetchMedia();
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setVidGenerating(false);
    }
  }

  async function copyToClipboard() {
    const text = `${c.name} | ${c.platform}\n${c.headline ?? ''}\n${c.primary_text ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch {
      /* noop */
    }
  }

  async function toggleLaunched() {
    const newStatus = c.status === 'active' ? 'draft' : 'active';
    const res = await fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) onStatusChange(c.id, newStatus);
  }

  async function launchOnMeta() {
    const budgetPaise = Math.round(parseFloat(launchBudget) * 100);
    setLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: c.id, dailyBudgetPaise: budgetPaise }),
      });
      const data = await res.json();
      if (res.ok) {
        onStatusChange(c.id, 'active', data.metaCampaignId);
        setLaunchResult({ ok: true, msg: `Created on Meta (PAUSED) · ID: ${String(data.metaCampaignId ?? '').slice(0, 10)}` });
      } else {
        setLaunchResult({ ok: false, msg: data.error ?? 'Launch failed' });
      }
    } catch {
      setLaunchResult({ ok: false, msg: 'Network error' });
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl border transition-all duration-200 hover:border-[rgba(255,255,255,0.13)] overflow-hidden"
      style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Media preview area */}
      {(imageMedia || videoMedia) && (
        <div className="relative w-full aspect-video bg-black">
          {videoMedia ? (
            <video
              src={videoMedia.url}
              controls
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : imageMedia ? (
            <Image
              src={imageMedia.url}
              alt={c.headline ?? c.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : null}
          <span
            className="absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide"
            style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.30)' }}
          >
            AI generated
          </span>
        </div>
      )}

      <div className="flex flex-col p-5 flex-1">
        {/* Header row */}
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

        {/* Media generation buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generateImage}
            disabled={imgGenerating || vidGenerating}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            {imgGenerating ? (
              <>
                <Spinner />
                Generating image (60s)…
              </>
            ) : (
              imageMedia ? 'Regenerate Image' : 'Generate Image'
            )}
          </button>
          <button
            onClick={generateVideo}
            disabled={imgGenerating || vidGenerating}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
            style={{ borderColor: 'rgba(212,175,55,0.30)', backgroundColor: 'rgba(212,175,55,0.08)', color: '#D4AF37' }}
          >
            {vidGenerating ? (
              <>
                <Spinner />
                Generating video (3 min)…
              </>
            ) : (
              videoMedia ? 'Regenerate Video' : 'Generate Video'
            )}
          </button>
        </div>

        {mediaError && (
          <p
            className="mt-2 rounded-xl border px-3 py-1.5 text-[12px] text-red-400"
            style={{ borderColor: 'rgba(239,68,68,0.20)', backgroundColor: 'rgba(239,68,68,0.05)' }}
          >
            {mediaError}
          </p>
        )}

        {/* Action footer */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="rounded-xl border px-3 py-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              {copiedId ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={toggleLaunched}
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
                  value={launchBudget}
                  onChange={(e) => setLaunchBudget(e.target.value)}
                  title="Daily budget in ₹"
                  className="w-20 rounded-xl border px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
                />
                <span className="text-[11px] text-gray-600">₹/day</span>
                <button
                  onClick={launchOnMeta}
                  disabled={launching}
                  className="rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                  style={{ borderColor: 'rgba(59,130,246,0.20)', backgroundColor: 'rgba(59,130,246,0.10)', color: '#93c5fd' }}
                >
                  {launching ? 'Launching…' : 'Launch on Meta'}
                </button>
              </div>
            )}
          </div>
          {c.external_campaign_id && (
            <p className="mt-2 font-mono text-[11px] text-gray-600">
              Meta ID: {c.external_campaign_id.slice(0, 12)}…
            </p>
          )}
          {launchResult && (
            <p className="mt-2 text-[12px]" style={{ color: launchResult.ok ? '#34d399' : '#fca5a5' }}>
              {launchResult.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="12"
      height="12"
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
