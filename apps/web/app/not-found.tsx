import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#0B0B0C' }}>
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: '#D4AF37' }}>404</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white">This page doesn&apos;t exist</h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-gray-500">
        The link may be old, or the page moved. Head back to the dashboard — everything is reachable from there.
      </p>
      <Link href="/dashboard" className="mt-8 rounded-xl px-6 py-3 text-[13px] font-bold transition-all duration-150 hover:opacity-90"
        style={{ backgroundColor: '#D4AF37', color: '#000' }}>
        Go to dashboard →
      </Link>
    </div>
  );
}
