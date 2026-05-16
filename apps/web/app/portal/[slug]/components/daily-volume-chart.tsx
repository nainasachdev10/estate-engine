'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type DailyVolumeDatum = {
  date: string; // ISO yyyy-mm-dd
  label: string; // e.g. "May 1"
  count: number;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: DailyVolumeDatum }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border border-[#d4af37]/40 bg-[#0f0f0f] px-3 py-2 shadow-xl">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">{label ?? d.label}</div>
      <div
        className="mt-1 font-serif text-xl text-[#d4af37]"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {d.count.toLocaleString('en-IN')}{' '}
        <span className="text-xs uppercase tracking-widest text-white/40">leads</span>
      </div>
    </div>
  );
}

export default function DailyVolumeChart({ data }: { data: DailyVolumeDatum[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4af37" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(212,175,55,0.4)', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={<CustomTooltip />}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#d4af37"
            strokeWidth={2}
            fill="url(#goldFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
