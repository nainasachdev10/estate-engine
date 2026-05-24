import type { ReactNode } from 'react';

export type FunnelRow = {
  status: string;
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type SourceRow = {
  source: string;
  leads: number;
  pct: number;
  avgScore: number;
};

export type VoiceStats = {
  totalCalls: number;
  connectedPct: number;
  qualifiedPct: number;
  avgDuration: number;
  outcomes: { key: string; label: string; count: number }[];
};

export type ChannelRow = {
  channel: string;
  sent: number;
  deliveredPct: number;
  readPct: number;
};

export type SocialPlatformRow = { platform: string; count: number };

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-dark-tertiary bg-dark-secondary p-6 shadow-[0_0_0_1px_rgba(212,175,55,0.04)]">
      <div className="-mt-6 mb-5 h-0.5 rounded-b-full bg-gradient-gold" aria-hidden />
      <div className="mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-200">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dark-tertiary bg-dark-bg px-4 py-3">
      <p className="text-2xl font-bold text-gold">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
    </div>
  );
}

export function fmtDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook: 'bg-blue-500',
  linkedin: 'bg-sky-500',
  twitter: 'bg-cyan-500',
  meta: 'bg-blue-500',
  google: 'bg-amber-500',
  '99acres': 'bg-purple-500',
};
