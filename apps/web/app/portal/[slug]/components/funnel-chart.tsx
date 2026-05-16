'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type FunnelDatum = {
  stage: string;
  label: string;
  count: number;
};

const GOLD = '#d4af37';
const GOLD_DIM = 'rgba(212, 175, 55, 0.55)';

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: FunnelDatum }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border border-[#d4af37]/40 bg-[#0f0f0f] px-3 py-2 shadow-xl">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">{d.label}</div>
      <div
        className="mt-1 font-serif text-xl text-[#d4af37]"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {d.count.toLocaleString('en-IN')}
      </div>
    </div>
  );
}

export default function FunnelChart({ data }: { data: FunnelDatum[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 32, left: 8, bottom: 8 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, maxCount]}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.08)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.08)"
          />
          <Tooltip
            cursor={{ fill: 'rgba(212,175,55,0.06)' }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((entry, i) => (
              <Cell
                key={entry.stage}
                fill={i === 0 ? GOLD : GOLD_DIM}
                fillOpacity={1 - i * 0.06}
              />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              fill="#d4af37"
              fontSize={11}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
