'use client';

type Project = { id: string; name: string; location: string | null };

export default function SocialToolbar({
  projects,
  projectId,
  onProjectChange,
  onGenerate,
  onApproveAll,
  generating,
  isPending,
  bulkRunning,
  draftCount,
  postCount,
}: {
  projects: Project[];
  projectId: string;
  onProjectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGenerate: () => void;
  onApproveAll: () => void;
  generating: boolean;
  isPending: boolean;
  bulkRunning: boolean;
  draftCount: number;
  postCount: number;
}) {
  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
        Project
      </span>
      <select
        value={projectId}
        onChange={onProjectChange}
        className="rounded-xl border px-3 py-2 text-[13px] font-medium text-white outline-none transition focus:border-[rgba(212,175,55,0.5)]"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <option value="">— Select project —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} {p.location ? `· ${p.location}` : ''}
          </option>
        ))}
      </select>

      <button
        onClick={onGenerate}
        disabled={generating || isPending || !projectId}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#D4AF37', color: '#000' }}
      >
        {generating && (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"
          />
        )}
        {generating ? 'Generating…' : 'Generate 30 posts'}
      </button>

      {draftCount > 0 && (
        <button
          onClick={onApproveAll}
          disabled={bulkRunning}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
          style={{
            borderColor: 'rgba(52,211,153,0.30)',
            backgroundColor: 'rgba(52,211,153,0.08)',
          }}
        >
          {bulkRunning && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent"
            />
          )}
          {bulkRunning ? 'Approving…' : `Approve all ${draftCount} drafts`}
        </button>
      )}

      <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600">
        {postCount} post{postCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}
