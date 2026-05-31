'use client';

import { PLATFORM_META, PLATFORM_ORDER, type SocialPost } from './social-post-card';

const CHIP_TONES = {
  gold: 'border-gold/30 bg-gold/10 text-gold',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  gray: 'border-dark-tertiary bg-dark-bg text-gray-300',
} as const;

function StatChip({ label, value, tone }: { label: string; value: number; tone: keyof typeof CHIP_TONES }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${CHIP_TONES[tone]}`}>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="text-[11px] uppercase tracking-[0.1em] opacity-80">{label}</span>
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
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-dark-tertiary bg-dark-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2.5">
        <StatChip label="Total" value={posts.length} tone="gold" />
        <StatChip label="Scheduled" value={scheduled} tone="blue" />
        <StatChip label="Posted" value={posted} tone="green" />
        <StatChip label="Draft" value={draft} tone="gray" />
      </div>
      {platforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {platforms.map((p) => (
            <span key={p.platform} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`h-2 w-2 rounded-full ${PLATFORM_META[p.platform]?.dot ?? 'bg-gray-500'}`} />
              <span className="capitalize">{p.platform}</span>
              <span className="font-mono text-gray-300">{p.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
