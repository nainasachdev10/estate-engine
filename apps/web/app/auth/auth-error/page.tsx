export default function AuthErrorPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: '#000' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[400px] w-[400px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(212,175,55,0.10), transparent 65%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div
          className="relative overflow-hidden rounded-2xl border p-10 text-center shadow-2xl"
          style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }}
        >
          {/* Gold top hairline */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)',
            }}
          />

          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              borderColor: 'rgba(212,175,55,0.20)',
              backgroundColor: 'rgba(212,175,55,0.08)',
            }}
          >
            <span style={{ color: '#D4AF37', fontSize: '1.1rem' }}>⏱</span>
          </div>

          <h1 className="mb-3 text-2xl font-black tracking-tight text-white">
            Login link expired
          </h1>
          <p className="mb-8 text-[14px] leading-relaxed text-gray-500">
            Magic links expire after 1 hour. Please request a new one.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-[13px] font-bold transition hover:opacity-90"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}
          >
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
