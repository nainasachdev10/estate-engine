'use client';

import type { CSSProperties } from 'react';

export type SocialPost = {
  id: string;
  project_id: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'twitter';
  post_type: string | null;
  caption: string | null;
  hashtags: string[] | null;
  media_brief: string | null;
  scheduled_at: string | null;
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'skipped';
  theme: string | null;
  projects?: { name: string } | null;
};

export const PLATFORM_META: Record<string, { label: string; dot: string; tag: string }> = {
  instagram: { label: 'IG', dot: 'bg-pink-500', tag: 'border-pink-500/30 bg-pink-500/10 text-pink-300' },
  facebook: { label: 'FB', dot: 'bg-blue-500', tag: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  linkedin: { label: 'IN', dot: 'bg-sky-500', tag: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  twitter: { label: 'X', dot: 'bg-cyan-500', tag: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' },
};

export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin', 'twitter'] as const;

const THEME_COLOR: Record<string, string> = {
  lifestyle: 'bg-pink-500/10 text-pink-300',
  amenities: 'bg-blue-500/10 text-blue-300',
  neighborhood: 'bg-emerald-500/10 text-emerald-300',
  trust_signal: 'bg-amber-500/10 text-amber-300',
  offer: 'bg-orange-500/10 text-orange-300',
  testimonial: 'bg-purple-500/10 text-purple-300',
  construction_progress: 'bg-indigo-500/10 text-indigo-300',
};

const STATUS_STYLE: Record<string, CSSProperties> = {
  scheduled: { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' },
  draft: { backgroundColor: 'rgba(255,255,255,0.06)', color: '#9CA3AF' },
  posted: { backgroundColor: 'rgba(129,140,248,0.10)', color: '#a5b4fc' },
  published: { backgroundColor: 'rgba(129,140,248,0.10)', color: '#a5b4fc' },
  failed: { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' },
  skipped: { backgroundColor: 'rgba(255,255,255,0.04)', color: '#6B7280' },
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]"
      style={STATUS_STYLE[status] ?? STATUS_STYLE.draft}
    >
      {status}
    </span>
  );
}

export default function SocialPostCard({
  post,
  busy,
  onApprove,
  onSkip,
}: {
  post: SocialPost;
  busy: boolean;
  onApprove: () => void;
  onSkip: () => void;
}) {
  const caption = post.caption ?? '';
  const pf = PLATFORM_META[post.platform];
  const scheduledIST = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unscheduled';
  const isDraft = post.status === 'draft';

  return (
    <div
      className="flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)]"
      style={
        isDraft
          ? {
              backgroundColor: '#0a0a0a',
              borderColor: 'rgba(212,175,55,0.18)',
            }
          : {
              backgroundColor: '#090909',
              borderColor: 'rgba(255,255,255,0.07)',
            }
      }
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-black ${
              pf?.tag ?? 'border-white/10 bg-white/[0.04] text-gray-300'
            }`}
            aria-hidden
          >
            {pf?.label ?? '?'}
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold capitalize text-white leading-tight">
              {post.platform}
            </span>
            {post.post_type && (
              <span className="text-[10px] uppercase tracking-[0.16em] text-gray-600">
                {post.post_type}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={post.status} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span
          className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#D4AF37' }}
        >
          {scheduledIST}
        </span>
        {post.theme && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
              THEME_COLOR[post.theme] ?? 'bg-white/[0.04] text-gray-400'
            }`}
          >
            {post.theme.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <p
        className="mb-3 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-300"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {caption}
      </p>

      {post.media_brief && (
        <p
          className="mb-3 line-clamp-2 rounded-lg border px-3 py-2 text-[11px] italic text-gray-500"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {post.media_brief}
        </p>
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {post.hashtags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: 'rgba(212,175,55,0.10)',
                color: '#D4AF37',
              }}
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
          {post.hashtags.length > 4 && (
            <span className="text-[10px] font-medium text-gray-600">
              +{post.hashtags.length - 4}
            </span>
          )}
        </div>
      )}

      {isDraft && (
        <div
          className="mt-auto flex items-center justify-end gap-2 border-t pt-3"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <button
            onClick={onSkip}
            disabled={busy}
            className="rounded-xl border px-3 py-1.5 text-[12px] font-medium text-gray-400 transition hover:text-white disabled:opacity-50"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }}
          >
            Skip
          </button>
          <button
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            {busy ? (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent"
              />
            ) : (
              <span aria-hidden>✓</span>
            )}
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
