type StatItem = {
  label: string;
  value: string;
  hint?: string;
};

function StatCard({ label, value, hint }: StatItem) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(212,175,55,0.5), transparent)',
        }}
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
        {label}
      </p>
      <p className="mt-3 font-mono text-4xl font-black tracking-tight text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

export default function PortalStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </section>
  );
}
