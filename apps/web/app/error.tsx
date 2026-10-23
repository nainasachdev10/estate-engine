'use client';

// Global error boundary — a thrown server/client error shows a branded
// recovery screen instead of a white page. reset() re-renders the segment.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#0B0B0C' }}>
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-red-400">Something broke</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white">We hit an unexpected error</h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-gray-500">
        It&apos;s been logged. Try again — if it keeps happening, the Health page shows what&apos;s failing.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-gray-700">ref: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="rounded-xl px-6 py-3 text-[13px] font-bold transition-all duration-150 hover:opacity-90"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}>
          Try again
        </button>
        <a href="/dashboard" className="rounded-xl border px-6 py-3 text-[13px] font-bold text-gray-300 transition-all duration-150 hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          Dashboard
        </a>
      </div>
    </div>
  );
}
