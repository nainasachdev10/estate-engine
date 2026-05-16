'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setError('Pick a project first');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, days: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Failed to generate');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function approvePost(id: string) {
    const res = await fetch(`/api/social/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'scheduled' } : p)));
    }
  }

  async function approveAll() {
    const drafts = posts.filter((p) => p.status === 'draft');
    for (const p of drafts) {
      await approvePost(p.id);
    }
  }

  const draftCount = posts.filter((p) => p.status === 'draft').length;

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
          className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-dark-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate 30 days of posts'}
        </button>

        {draftCount > 0 && (
          <button
            onClick={approveAll}
            className="rounded-lg border border-green-700 bg-green-900/30 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-900/50"
          >
            Approve all {draftCount} drafts
          </button>
        )}

        <span className="ml-auto text-xs text-gray-500">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dark-tertiary p-12 text-center">
          <p className="text-gray-400">No posts yet for this project.</p>
          <p className="text-sm text-gray-500 mt-1">
            Click <span className="text-gold">Generate 30 days</span> to spin up Claude.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onApprove={approvePost} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onApprove }: { post: Post; onApprove: (id: string) => void }) {
  const caption = post.caption ?? '';
  const preview = caption.length > 80 ? `${caption.slice(0, 80)}…` : caption;
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
    <div className="rounded-lg border border-dark-tertiary bg-dark-secondary p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">{PLATFORM_EMOJI[post.platform] ?? '📡'}</span>
          <span className="font-medium capitalize text-gray-200">{post.platform}</span>
          <span className="text-xs text-gray-500">· {post.post_type}</span>
        </div>
        <StatusBadge status={post.status} />
      </div>

      <p className="mb-3 text-sm text-gray-300 leading-relaxed">{preview}</p>

      {post.hashtags && post.hashtags.length > 0 && (
        <p className="mb-3 text-xs text-blue-300">
          {post.hashtags.slice(0, 5).join(' ')}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {post.theme && (
            <span className={`rounded-full px-2 py-0.5 font-medium ${THEME_COLOR[post.theme] ?? 'bg-gray-800 text-gray-400'}`}>
              {post.theme.replace(/_/g, ' ')}
            </span>
          )}
          <span className="text-gray-500">{scheduledIST}</span>
        </div>
        {post.status === 'draft' && (
          <button
            onClick={() => onApprove(post.id)}
            className="rounded bg-gold px-3 py-1 font-semibold text-dark-bg transition hover:opacity-90"
          >
            Approve
          </button>
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
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}
