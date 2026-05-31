'use client';

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
  instagram: { label: 'IG', dot: 'bg-pink-500', tag: 'border-pink-500/40 bg-pink-500/10 text-pink-300' },
  facebook: { label: 'FB', dot: 'bg-blue-500', tag: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
  linkedin: { label: 'IN', dot: 'bg-sky-500', tag: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  twitter: { label: 'X', dot: 'bg-cyan-500', tag: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
};

export const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin', 'twitter'] as const;

const THEME_COLOR: Record<string, string> = {
  lifestyle: 'bg-pink-900 text-pink-300',
  amenities: 'bg-blue-900 text-blue-300',
  neighborhood: 'bg-green-900 text-green-300',
  trust_signal: 'bg-yellow-900 text-yellow-300',
  offer: 'bg-orange-900 text-orange-300',
  testimonial: 'bg-purple-900 text-purple-300',
  construction_progress: 'bg-indigo-900 text-indigo-300',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-800 text-gray-400',
    scheduled: 'bg-blue-900 text-blue-300',
    posted: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    skipped: 'bg-gray-900 text-gray-500',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] ?? 'bg-gray-800 text-gray-400'
      }`}
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
  const isPosted = post.status === 'posted';

  return (
    <div
      className={`flex flex-col rounded-xl border bg-dark-secondary p-4 transition-colors ${
        isDraft
          ? 'border-dark-tertiary ring-1 ring-inset ring-gold/30'
          : 'border-dark-tertiary hover:border-gray-600'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold ${
              pf?.tag ?? 'border-gray-600 bg-gray-800 text-gray-300'
            }`}
            aria-hidden
          >
            {pf?.label ?? '?'}
          </span>
          <span className="font-medium capitalize text-gray-200">{post.platform}</span>
          {post.post_type && <span className="text-xs text-gray-500">· {post.post_type}</span>}
        </div>
        {isPosted ? (
          <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-medium text-emerald-300">
            ✓ Posted
          </span>
        ) : (
          <StatusBadge status={post.status} />
        )}
      </div>

      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-gray-400">
        <span className="text-gold/80">{scheduledIST}</span>
        {post.theme && (
          <span
            className={`rounded-full px-2 py-0.5 ${
              THEME_COLOR[post.theme] ?? 'bg-gray-800 text-gray-400'
            }`}
          >
            {post.theme.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <p
        className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300"
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
        <p className="mb-2 line-clamp-2 text-xs italic text-gray-500">📸 {post.media_brief}</p>
      )}

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {post.hashtags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-300"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
          {post.hashtags.length > 4 && (
            <span className="text-[11px] text-gray-500">+{post.hashtags.length - 4}</span>
          )}
        </div>
      )}

      {isDraft && (
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-dark-tertiary pt-3 text-xs">
          <button
            onClick={onSkip}
            disabled={busy}
            className="rounded-md border border-dark-tertiary px-2.5 py-1 text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
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
