// Route-group skeleton: every dashboard navigation shows this shimmer frame
// (header → stat row → two cards) instead of a blank screen while server
// components fetch. Shapes mirror the real layout so content doesn't jump.

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8" aria-busy="true" aria-label="Loading">
      <div className="mb-8">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-3 h-7 w-64" />
        <Shimmer className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
            <Shimmer className="h-3 w-20" />
            <Shimmer className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
            <Shimmer className="h-4 w-40" />
            <Shimmer className="mt-2 h-3 w-64" />
            <div className="mt-5 space-y-3">
              <Shimmer className="h-11 w-full" />
              <Shimmer className="h-11 w-full" />
              <Shimmer className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
