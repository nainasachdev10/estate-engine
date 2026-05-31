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
    'w-full rounded-xl border px-4 py-3 text-[14px] text-white placeholder:text-gray-600 transition-colors focus:outline-none disabled:opacity-50';
  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  };
  const labelClass =
    'block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-2';

  function handleFocus(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.borderColor = '#D4AF37';
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(212,175,55,0.4)';
  }
  function handleBlur(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
    e.currentTarget.style.boxShadow = 'none';
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"
      style={{ backgroundColor: '#000' }}
    >
      {/* Dot grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(212,175,55,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Corner glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(212,175,55,0.12), transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(212,175,55,0.08), transparent 65%)',
        }}
      />

      <div className="relative w-full max-w-lg">
        <div
          className="relative overflow-hidden rounded-2xl border p-8 shadow-2xl"
          style={{
            backgroundColor: '#0a0a0a',
            borderColor: 'rgba(212,175,55,0.18)',
          }}
        >
          {/* Gold top hairline */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)',
            }}
          />

          {/* Brand header inside card */}
          <div className="mb-8 text-center">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-base font-bold"
              style={{
                borderColor: 'rgba(212,175,55,0.18)',
                color: '#D4AF37',
                backgroundColor: 'rgba(212,175,55,0.10)',
              }}
            >
              ⬡
            </span>
            <p
              className="mt-3 font-serif text-2xl font-bold tracking-tight"
              style={{ color: '#D4AF37', fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Realty Engine
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-gray-600">
              Request access
            </p>
          </div>

          {submitted ? (
            <div
              className="border-t py-8 text-center"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'rgba(212,175,55,0.30)',
                  backgroundColor: 'rgba(212,175,55,0.10)',
                }}
              >
                <span style={{ color: '#D4AF37', fontSize: '1.5rem' }}>&#10003;</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Request received
              </h2>
              <p className="mt-3 text-[14px] text-gray-400 leading-relaxed">
                We&apos;ll review and reach out within 24 hours.
              </p>
            </div>
          ) : (
            <>
              <div
                className="mb-6 border-t pt-6"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <h1 className="text-xl font-black tracking-tight text-white">
                  You&apos;re almost in
                </h1>
                <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
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

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="activeProjects" className={labelClass}>
                      Active projects
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
                      Monthly leads
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
                    className="w-full resize-none rounded-xl border px-4 py-3 text-[14px] text-white placeholder:text-gray-600 transition-colors focus:outline-none disabled:opacity-50"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {error && (
                  <p
                    className="rounded-xl border px-3 py-2.5 text-[12px]"
                    style={{
                      borderColor: 'rgba(248,113,113,0.30)',
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: '#D4AF37', color: '#000' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting request…
                    </>
                  ) : (
                    'Submit request'
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
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 underline-offset-4 transition-colors hover:text-gray-400 hover:underline disabled:opacity-50"
          >
            {signOutLoading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </main>
  );
}
