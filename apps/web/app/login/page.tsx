'use client';

import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { LogoMark } from '../components/logo';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

type Mode = 'signin' | 'signup';

interface CheckRoleResponse {
  role: 'admin' | 'client' | 'unknown';
  portalSlug?: string;
}

function LoginContent() {
  const searchParams = useSearchParams();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function translateError(msg: string): string {
    if (msg.toLowerCase().includes('invalid login credentials')) {
      return 'Incorrect email or password.';
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
      return 'Check your email — you need to confirm your account first.';
    }
    if (msg.toLowerCase().includes('user already registered')) {
      return 'Account exists. Sign in instead.';
    }
    return msg;
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const redirectTo =
        (typeof window !== 'undefined' ? window.location.origin : '') +
        '/auth/callback';
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) {
          setError(translateError(signUpError.message));
          return;
        }
        if (signUpData.session) {
          // Email confirmation disabled — session is live, route by role
          const res = await fetch('/api/auth/check-role');
          const roleData: CheckRoleResponse = await res.json();
          if (roleData.role === 'admin') {
            window.location.href = '/pipeline';
          } else if (roleData.role === 'client' && roleData.portalSlug) {
            window.location.href = '/portal/' + roleData.portalSlug;
          } else {
            window.location.href = '/request-access';
          }
        } else {
          // Email confirmation required
          setSuccess('Check your email to confirm your account, then sign in.');
        }
        return;
      }

      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(translateError(signInError.message));
        return;
      }

      // Role check
      const res = await fetch('/api/auth/check-role');
      const data: CheckRoleResponse = await res.json();

      if (data.role === 'admin') {
        window.location.href = '/pipeline';
      } else if (data.role === 'client' && data.portalSlug) {
        window.location.href = '/portal/' + data.portalSlug;
      } else {
        const redirectTo = searchParams?.get('redirectTo');
        window.location.href = redirectTo ?? '/request-access';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  }

  const inputBase =
    'w-full rounded-xl border px-4 py-3 text-[14px] text-white placeholder:text-gray-600 transition-colors focus:outline-none disabled:opacity-50';
  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  };

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#D4AF37';
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(212,175,55,0.4)';
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
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
      {/* Top-left gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(212,175,55,0.12), transparent 65%)',
        }}
      />
      {/* Bottom-right gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(212,175,55,0.08), transparent 65%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
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
            <Link
              href="/"
              className="inline-flex flex-col items-center gap-2"
              aria-label="Realty Engine home"
            >
              <LogoMark size={44} />
              <span
                className="font-serif text-3xl font-bold tracking-tight"
                style={{ color: '#D4AF37', fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Realty Engine
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-gray-600">
                Acquisition Console
              </span>
            </Link>
          </div>

          <div
            className="mb-6 border-t pt-6"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <h1 className="text-xl font-black tracking-tight text-white">
              {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
              {mode === 'signin'
                ? 'Welcome back. Continue to your dashboard.'
                : 'Get started in under a minute.'}
            </p>
          </div>

          {/* Google OAuth — secondary button style */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl border px-5 py-3 text-[14px] font-medium text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
              or
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Email / Password form */}
          {success ? (
            <div
              className="rounded-xl border px-4 py-4 text-center text-[13px]"
              style={{
                borderColor: 'rgba(212,175,55,0.25)',
                backgroundColor: 'rgba(212,175,55,0.06)',
                color: '#D4AF37',
              }}
            >
              {success}
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    disabled={loading}
                    className={inputBase}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@realestate.in"
                  disabled={loading}
                  className={inputBase}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    disabled={loading}
                    className={inputBase + ' pr-11'}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <label
                    htmlFor="confirm-password"
                    className="block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      disabled={loading}
                      className={inputBase + ' pr-11'}
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

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
                disabled={loading || googleLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: '#D4AF37', color: '#000' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : mode === 'signin' ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </form>
          )}

          {/* Toggle mode */}
          <p className="mt-6 text-center text-[12px] text-gray-500">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold underline-offset-4 hover:underline"
                  style={{ color: '#D4AF37' }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-semibold underline-offset-4 hover:underline"
                  style={{ color: '#D4AF37' }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-gray-600">
          Secure access · End-to-end encrypted
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ backgroundColor: '#000' }}
        />
      }
    >
      <LoginContent />
    </Suspense>
  );
}
