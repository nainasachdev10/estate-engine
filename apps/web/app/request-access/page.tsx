'use client';

import { createBrowserClient } from '@supabase/ssr';
import { FormEvent, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RequestAccessPayload {
  fullName: string;
  company: string;
  activeProjects: string;
  monthlyLeadVolume: string;
  message: string;
}

export default function RequestAccessPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [activeProjects, setActiveProjects] = useState('');
  const [monthlyLeadVolume, setMonthlyLeadVolume] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: RequestAccessPayload = {
      fullName,
      company,
      activeProjects,
      monthlyLeadVolume,
      message,
    };

    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to submit request. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const inputBase =
    'w-full rounded-md border bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder:text-gray-600 transition-colors focus:outline-none disabled:opacity-50';
  const inputStyle = { borderColor: 'rgba(255,255,255,0.08)' };
  const labelClass = 'block text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-1.5';

  function handleFocus(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.borderColor = '#d4af37';
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(212,175,55,0.4)';
  }
  function handleBlur(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = 'none';
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-6 py-12"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Subtle diagonal pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #d4af37 0, #d4af37 1px, transparent 1px, transparent 16px)',
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.08), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded border text-base font-bold"
            style={{
              borderColor: 'rgba(212,175,55,0.3)',
              color: '#d4af37',
              backgroundColor: 'rgba(212,175,55,0.07)',
            }}
          >
            ⬡
          </span>
          <p
            className="mt-3 font-serif text-2xl font-bold tracking-tight"
            style={{ color: '#d4af37' }}
          >
            Realty Engine
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-gray-500">
            Request access
          </p>
        </div>

        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {submitted ? (
            <div className="py-6 text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'rgba(212,175,55,0.3)',
                  backgroundColor: 'rgba(212,175,55,0.07)',
                }}
              >
                <span style={{ color: '#d4af37', fontSize: '1.25rem' }}>&#10003;</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Request received</h2>
              <p className="mt-2 text-sm text-gray-400">
                We&apos;ll review and reach out within 24 hours.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  You&apos;re almost in
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Your account is created. Tell us a bit about your work so we can set up the right access.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahul Sharma"
                    disabled={loading}
                    className={inputBase}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div>
                  <label htmlFor="company" className={labelClass}>
                    Company / Developer name
                  </label>
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Prestige Group"
                    disabled={loading}
                    className={inputBase}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div>
                  <label htmlFor="activeProjects" className={labelClass}>
                    Number of active projects
                  </label>
                  <select
                    id="activeProjects"
                    required
                    value={activeProjects}
                    onChange={(e) => setActiveProjects(e.target.value)}
                    disabled={loading}
                    className={inputBase}
                    style={{ ...inputStyle, appearance: 'none' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  >
                    <option value="" disabled>
                      Select range
                    </option>
                    <option value="1">1</option>
                    <option value="2-5">2–5</option>
                    <option value="6-10">6–10</option>
                    <option value="10+">10+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="monthlyLeadVolume" className={labelClass}>
                    Monthly lead volume
                  </label>
                  <select
                    id="monthlyLeadVolume"
                    required
                    value={monthlyLeadVolume}
                    onChange={(e) => setMonthlyLeadVolume(e.target.value)}
                    disabled={loading}
                    className={inputBase}
                    style={{ ...inputStyle, appearance: 'none' }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  >
                    <option value="" disabled>
                      Select range
                    </option>
                    <option value="<100">&lt;100</option>
                    <option value="100-500">100–500</option>
                    <option value="500-2000">500–2,000</option>
                    <option value="2000+">2,000+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className={labelClass}>
                    What you&apos;re looking for
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your current lead management process..."
                    disabled={loading}
                    className={
                      'w-full resize-none rounded-md border bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder:text-gray-600 transition-colors focus:outline-none disabled:opacity-50'
                    }
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {error && (
                  <p
                    className="rounded-md border px-3 py-2 text-xs"
                    style={{
                      borderColor: 'rgba(248,113,113,0.25)',
                      backgroundColor: 'rgba(248,113,113,0.08)',
                      color: '#fca5a5',
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending request…
                    </>
                  ) : (
                    'Send request'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="text-xs text-gray-600 underline-offset-4 transition-colors hover:text-gray-400 hover:underline disabled:opacity-50"
          >
            {signOutLoading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </main>
  );
}
