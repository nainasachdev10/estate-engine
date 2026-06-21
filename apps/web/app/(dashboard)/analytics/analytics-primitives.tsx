import type { ReactNode } from 'react';

export type FunnelRow = {
  status: string;
  label: string;
  reached: number; // cumulative leads that reached this stage or progressed beyond it
  stepPct: number | null; // conversion from the previous stage (0–100, never above)
  barPct: number; // reached / entered, for the bar width
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
    <section
      className="rounded-2xl border p-6"
      style={{ backgroundColor: '#090909', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="mb-5">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.18em] text-gray-500">{title}</h3>
        {subtitle && <p className="mt-1 text-[12px] text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <p className="font-mono text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</p>
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
