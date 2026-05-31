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
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <select
        value={projectId}
        onChange={onProjectChange}
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
        onClick={onGenerate}
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
          onClick={onApproveAll}
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
        {postCount} post{postCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}
