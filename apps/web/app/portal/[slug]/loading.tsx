// Portal skeleton — mirrors the executive overview so nothing jumps on load.
function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />;
}

export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12" aria-busy="true" aria-label="Loading">
      <div className="mb-12 border-b pb-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <Shimmer className="h-3 w-32" />
        <Shimmer className="mt-4 h-9 w-72" />
        <Shimmer className="mt-4 h-4 w-52" />
      </div>
      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.18)' }}>
            <Shimmer className="h-3 w-24" />
            <Shimmer className="mt-4 h-9 w-16" />
          </div>
        ))}
      </div>
      <Shimmer className="h-72 w-full" />
    </div>
  );
}
