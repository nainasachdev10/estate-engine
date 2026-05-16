'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function PortalLoginPage({ params, searchParams }: {
  params: { slug: string };
  searchParams: { redirectTo?: string; error?: string };
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = searchParams.redirectTo ?? `/portal/${params.slug}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            Realty Engine · Client Portal
          </p>
          <h1
            className="font-serif text-4xl font-bold text-white"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Enter your registered email to receive a secure login link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-[#d4af37]/30 bg-white/[0.03] p-8 text-center">
            <div className="mb-3 text-3xl">✉️</div>
            <h2 className="mb-2 font-serif text-xl text-[#d4af37]">Check your inbox</h2>
            <p className="text-sm text-white/60">
              We sent a login link to <strong className="text-white">{email}</strong>.
              Click it to access your dashboard. The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {searchParams.error === 'unauthorized' && (
              <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                This email is not authorised for this portal. Contact your account manager.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-white/60">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder-white/30 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#d4af37] px-4 py-3 font-semibold text-[#0a0a0a] transition hover:bg-[#c9a137] disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send login link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
