'use client';

import { PLATFORM_META, PLATFORM_ORDER, type SocialPost } from './social-post-card';

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
        {label}
      </span>
      <span
        className="mt-1 font-mono text-2xl font-black leading-none"
        style={accent ? { color: '#D4AF37' } : { color: '#FFFFFF' }}
      >
        {value.toLocaleString('en-IN')}
      </span>
    </div>
  );
}

export default function SocialStatsBar({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const posted = posts.filter((p) => p.status === 'posted').length;
  const draft = posts.filter((p) => p.status === 'draft').length;
  const platforms = PLATFORM_ORDER.map((pf) => ({
    platform: pf,
    count: posts.filter((p) => p.platform === pf).length,
  })).filter((p) => p.count > 0);

  return (
    <div
      className="mb-6 flex flex-col gap-5 rounded-2xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <Stat label="Total" value={posts.length} accent />
        <div
          className="hidden h-10 w-px sm:block"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
        <Stat label="Scheduled" value={scheduled} />
        <Stat label="Posted" value={posted} />
        <Stat label="Draft" value={draft} />
      </div>
      {platforms.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-4 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {platforms.map((p) => (
            <span key={p.platform} className="flex items-center gap-2 text-[12px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${PLATFORM_META[p.platform]?.dot ?? 'bg-gray-500'}`}
              />
              <span className="capitalize text-gray-400">{p.platform}</span>
              <span className="font-mono font-bold text-white">{p.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
