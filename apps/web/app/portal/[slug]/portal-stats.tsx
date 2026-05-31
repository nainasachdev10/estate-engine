type StatItem = {
  label: string;
  value: string;
  hint?: string;
};

function StatCard({ label, value, hint }: StatItem) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p
        className="mt-2 text-3xl font-bold text-[#d4af37]"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

export default function PortalStats({ stats }: { stats: StatItem[] }) {
  return (
    <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </section>
  );
}
