'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import SocialWeekGroup from './social-week-group';
import SocialToolbar from './social-toolbar';
import SocialStatsBar from './social-stats-bar';
import type { SocialPost } from './social-post-card';

type Project = { id: string; name: string; location: string | null };
type Toast = { id: number; tone: 'success' | 'error' | 'info'; message: string };

const TONE_TOAST: Record<Toast['tone'], string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  info: 'border-white/10 bg-[#0a0a0a] text-white/90',
};

function isoWeekKey(iso: string | null): string {
  if (!iso) return 'Unscheduled';
  const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  const dow = ist.getUTCDay() || 7;
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - (dow - 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function SocialCalendarClient({
  projects,
  initialPosts,
  initialProjectId,
}: {
  projects: Project[];
  initialPosts: SocialPost[];
  initialProjectId: string;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [generating, setGenerating] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function pushToast(tone: Toast['tone'], message: string) {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, tone, message }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3500);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    setProjectId(newId);
    startTransition(() => { router.push(`/social?project=${newId}`); router.refresh(); });
  }

  async function handleGenerate() {
    if (!projectId) return pushToast('error', 'Pick a project first');
    setGenerating(true);
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.NEXT_PUBLIC_INTERNAL_API_SECRET ?? '' },
        body: JSON.stringify({ projectId, days: 30 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return pushToast('error', data?.error ?? 'Failed to generate posts');
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
    setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'skipped' } : p)));
    try {
      const res = await fetch(`/api/social/${id}/skip`, { method: 'POST' });
      if (!res.ok && res.status !== 404) {
        setPosts((cur) => cur.map((p) => (p.id === id && prev ? { ...p, status: prev } : p)));
        const data = await res.json().catch(() => ({}));
        pushToast('error', data?.error ?? 'Could not skip');
        return;
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
    let ok = 0, failed = 0;
    for (const p of drafts) {
      // eslint-disable-next-line no-await-in-loop
      const success = await approvePost(p.id, { silent: true });
      if (success) ok++; else failed++;
    }
    setBulkRunning(false);
    if (failed === 0) pushToast('success', `Approved ${ok} drafts`);
    else pushToast('error', `Approved ${ok}, ${failed} failed`);
  }

  const draftCount = posts.filter((p) => p.status === 'draft').length;

  const grouped = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
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
      <SocialStatsBar posts={posts} />

      <SocialToolbar
        projects={projects}
        projectId={projectId}
        onProjectChange={handleProjectChange}
        onGenerate={handleGenerate}
        onApproveAll={approveAll}
        generating={generating}
        isPending={isPending}
        bulkRunning={bulkRunning}
        draftCount={draftCount}
        postCount={posts.length}
      />

      {posts.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed p-12 text-center"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
        >
          <p className="text-base font-bold text-white">No posts yet for this project</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-gray-500">
            Click{' '}
            <span style={{ color: '#D4AF37' }} className="font-semibold">
              Generate 30 posts
            </span>{' '}
            to spin up Claude and create a month of content.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([week, weekPosts]) => (
            <SocialWeekGroup key={week} week={week} posts={weekPosts} busy={busy} onApprove={approvePost} onSkip={skipPost} />
          ))}
        </div>
      )}

      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto min-w-[260px] rounded-xl border px-4 py-3 text-[13px] font-medium shadow-2xl backdrop-blur transition ${TONE_TOAST[t.tone]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
