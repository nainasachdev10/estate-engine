'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

type Project = { id: string; name: string; location: string | null };

type Post = {
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

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📷',
  facebook: '👥',
  linkedin: '💼',
  twitter: '🐦',
};

const THEME_COLOR: Record<string, string> = {
  lifestyle: 'bg-pink-900 text-pink-300',
  amenities: 'bg-blue-900 text-blue-300',
  neighborhood: 'bg-green-900 text-green-300',
  trust_signal: 'bg-yellow-900 text-yellow-300',
  offer: 'bg-orange-900 text-orange-300',
  testimonial: 'bg-purple-900 text-purple-300',
  construction_progress: 'bg-indigo-900 text-indigo-300',
};

type Toast = { id: number; tone: 'success' | 'error' | 'info'; message: string };

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto min-w-[260px] rounded-md border px-4 py-3 text-sm shadow-2xl backdrop-blur transition ${
            t.tone === 'success'
              ? 'border-emerald-600/40 bg-emerald-900/50 text-emerald-100'
              : t.tone === 'error'
              ? 'border-red-600/40 bg-red-900/50 text-red-100'
              : 'border-white/15 bg-[#0f0f0f] text-white/90'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function isoWeekKey(iso: string | null): string {
  if (!iso) return 'Unscheduled';
  const d = new Date(iso);
  // Compute Monday of the IST week
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const dow = ist.getUTCDay() || 7;
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - (dow - 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function SocialCalendarClient({
  projects,
  initialPosts,
  initialProjectId,
}: {
  projects: Project[];
  initialPosts: Post[];
  initialProjectId: string;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [generating, setGenerating] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function pushToast(tone: Toast['tone'], message: string) {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, tone, message }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3500);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    setProjectId(newId);
    startTransition(() => {
      router.push(`/social?project=${newId}`);
      router.refresh();
    });
  }

  async function handleGenerate() {
    if (!projectId) {
      pushToast('error', 'Pick a project first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, days: 30 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast('error', data?.error ?? 'Failed to generate posts');
        return;
      }
      pushToast('success', 'Generated 30 days of posts');
      router.refresh();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function approvePost(id: string, opts?: { silent?: boolean }) {
    if (busy[id]) return false;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`/api/social/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'scheduled' } : p)));
        if (!opts?.silent) pushToast('success', 'Post approved');
        return true;
      }
      const data = await res.json().catch(() => ({}));
      if (!opts?.silent) pushToast('error', data?.error ?? 'Could not approve');
      return false;
    } catch {
      if (!opts?.silent) pushToast('error', 'Network error');
      return false;
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function skipPost(id: string) {
    if (busy[id]) return;
    const prev = posts.find((p) => p.id === id)?.status;
    setBusy((b) => ({ ...b, [id]: true }));
    // optimistic
    setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'skipped' } : p)));
    try {
      const res = await fetch(`/api/social/${id}/skip`, { method: 'POST' });
      if (!res.ok) {
        // fall back to client-side hide if endpoint isn't there yet
        if (res.status !== 404) {
          setPosts((cur) => cur.map((p) => (p.id === id && prev ? { ...p, status: prev } : p)));
          const data = await res.json().catch(() => ({}));
          pushToast('error', data?.error ?? 'Could not skip');
          return;
        }
      }
      pushToast('info', 'Post skipped');
    } catch {
      pushToast('info', 'Skipped locally — endpoint not available');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function approveAll() {
    const drafts = posts.filter((p) => p.status === 'draft');
    if (drafts.length === 0) return;
    setBulkRunning(true);
    let ok = 0;
    let failed = 0;
    for (const p of drafts) {
      // eslint-disable-next-line no-await-in-loop
      const success = await approvePost(p.id, { silent: true });
      if (success) ok++;
      else failed++;
    }
    setBulkRunning(false);
    if (failed === 0) pushToast('success', `Approved ${ok} drafts`);
    else pushToast('error', `Approved ${ok}, ${failed} failed`);
  }

  const draftCount = posts.filter((p) => p.status === 'draft').length;

  const grouped = useMemo(() => {
    const map = new Map<string, Post[]>();
    const sorted = [...posts].sort((a, b) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
    for (const p of sorted) {
      const k = isoWeekKey(p.scheduled_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries());
  }, [posts]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={projectId}
          onChange={handleProjectChange}
          className="rounded-lg border border-dark-tertiary bg-dark-secondary px-4 py-2 text-sm text-white"
        >
          <option value="">— Select project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.location ? `· ${p.location}` : ''}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          disabled={generating || isPending || !projectId}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-dark-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {generating && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-dark-bg border-t-transparent"
            />
          )}
          {generating ? 'Generating…' : 'Generate 30 posts'}
        </button>

        {draftCount > 0 && (
          <button
            onClick={approveAll}
            disabled={bulkRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-green-700 bg-green-900/30 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-900/50 disabled:opacity-50"
          >
            {bulkRunning && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-300 border-t-transparent"
              />
            )}
            {bulkRunning ? 'Approving…' : `Approve all ${draftCount} drafts`}
          </button>
        )}

        <span className="ml-auto text-xs text-gray-500">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center">
          <p className="text-gray-400">No posts yet for this project.</p>
          <p className="mt-1 text-sm text-gray-500">
            Click <span className="text-gold">Generate 30 posts</span> to spin up Claude.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([week, weekPosts]) => (
            <section key={week}>
              <div className="mb-3 flex items-end justify-between border-b border-dark-tertiary pb-2">
                <h3 className="text-xs uppercase tracking-[0.25em] text-gold">{week}</h3>
                <span className="text-[11px] text-gray-500">
                  {weekPosts.length} post{weekPosts.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {weekPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    busy={!!busy[p.id]}
                    onApprove={() => approvePost(p.id)}
                    onSkip={() => skipPost(p.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Toaster toasts={toasts} />
    </div>
  );
}

function PostCard({
  post,
  busy,
  onApprove,
  onSkip,
}: {
  post: Post;
  busy: boolean;
  onApprove: () => void;
  onSkip: () => void;
}) {
  const caption = post.caption ?? '';
  const preview = caption.length > 140 ? `${caption.slice(0, 140)}…` : caption;
  const scheduledIST = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="flex flex-col rounded-lg border border-dark-tertiary bg-dark-secondary p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg" aria-hidden>
            {PLATFORM_EMOJI[post.platform] ?? '📡'}
          </span>
          <span className="font-medium capitalize text-gray-200">{post.platform}</span>
          {post.post_type && <span className="text-xs text-gray-500">· {post.post_type}</span>}
        </div>
        <StatusBadge status={post.status} />
      </div>

      <p
        className="mb-3 text-sm leading-relaxed text-gray-300"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {preview}
      </p>

      {post.hashtags && post.hashtags.length > 0 && (
        <p className="mb-3 truncate text-xs text-blue-300">{post.hashtags.slice(0, 5).join(' ')}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {post.theme && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                THEME_COLOR[post.theme] ?? 'bg-gray-800 text-gray-400'
              }`}
            >
              {post.theme.replace(/_/g, ' ')}
            </span>
          )}
          <span className="text-gray-500">{scheduledIST}</span>
        </div>
        {post.status === 'draft' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              disabled={busy}
              className="rounded border border-dark-tertiary px-2.5 py-1 text-gray-400 transition hover:border-gray-500 hover:text-gray-200 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {busy && (
                <span
                  aria-hidden
                  className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
              )}
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
