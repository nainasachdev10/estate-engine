'use client';

import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

type Step = 'email' | 'otp';

const OTP_LENGTH = 6;

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/pipeline';

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  // Auto-focus first OTP box when step changes to otp
  useEffect(() => {
    if (step === 'otp') {
      const first = otpRefs.current[0];
      if (first) first.focus();
    }
  }, [step]);

  const sendCode = useCallback(
    async (targetEmail: string, isResend = false) => {
      setError(null);
      setInfo(null);
      setSending(true);
      try {
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${getSiteUrl()}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (sendError) {
          setError(sendError.message);
          return false;
        }
        if (!isResend) {
          setStep('otp');
        } else {
          setInfo('A new code has been sent.');
        }
        setResendCooldown(30);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to send code.';
        setError(msg);
        return false;
      } finally {
        setSending(false);
      }
    },
    [supabase, redirectTo],
  );

  const handleEmailSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Enter a valid email address.');
        return;
      }
      setEmail(trimmed);
      await sendCode(trimmed, false);
    },
    [email, sendCode],
  );

  const verifyOtp = useCallback(
    async (code: string) => {
      if (verifying) return;
      setError(null);
      setVerifying(true);
      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });
        if (verifyError) {
          setError(verifyError.message);
          setOtp(Array(OTP_LENGTH).fill(''));
          const first = otpRefs.current[0];
          if (first) first.focus();
          return;
        }
        // Hard redirect so middleware picks up the new session cookies
        window.location.href = redirectTo || '/pipeline';
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verification failed.';
        setError(msg);
      } finally {
        setVerifying(false);
      }
    },
    [supabase, email, redirectTo, verifying],
  );

  const handleOtpChange = useCallback(
    (idx: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Only digits
      const digit = raw.replace(/\D/g, '').slice(-1);
      const next = [...otp];
      next[idx] = digit;
      setOtp(next);

      if (digit && idx < OTP_LENGTH - 1) {
        const nextInput = otpRefs.current[idx + 1];
        if (nextInput) nextInput.focus();
      }

      if (next.every((d) => d.length === 1)) {
        void verifyOtp(next.join(''));
      }
    },
    [otp, verifyOtp],
  );

  const handleOtpKeyDown = useCallback(
    (idx: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (otp[idx]) {
          const next = [...otp];
          next[idx] = '';
          setOtp(next);
          return;
        }
        if (idx > 0) {
          const prev = otpRefs.current[idx - 1];
          if (prev) prev.focus();
          const next = [...otp];
          next[idx - 1] = '';
          setOtp(next);
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        const prev = otpRefs.current[idx - 1];
        if (prev) prev.focus();
      } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
        e.preventDefault();
        const nextInput = otpRefs.current[idx + 1];
        if (nextInput) nextInput.focus();
      } else if (e.key === 'Enter') {
        if (otp.every((d) => d.length === 1)) {
          e.preventDefault();
          void verifyOtp(otp.join(''));
        }
      }
    },
    [otp, verifyOtp],
  );

  const handleOtpPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text');
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (!digits) return;
      e.preventDefault();
      const next = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < digits.length; i++) next[i] = digits[i];
      setOtp(next);
      const focusIdx = Math.min(digits.length, OTP_LENGTH - 1);
      const target = otpRefs.current[focusIdx];
      if (target) target.focus();
      if (digits.length === OTP_LENGTH) {
        void verifyOtp(digits);
      }
    },
    [verifyOtp],
  );

  const handleChangeEmail = useCallback(() => {
    setStep('email');
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(null);
    setInfo(null);
  }, []);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || sending) return;
    await sendCode(email, true);
  }, [sendCode, email, sending, resendCooldown]);

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-6"
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
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(212,175,55,0.10), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-1.5"
            aria-label="Realty Engine home"
          >
            <span
              className="font-serif text-3xl font-bold tracking-tight"
              style={{ color: '#d4af37' }}
            >
              Realty Engine
            </span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500">
              Acquisition Console
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Sign in
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Enter your admin email — we&apos;ll send a 6-digit code.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[11px] uppercase tracking-[0.18em] text-gray-500"
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
                  disabled={sending}
                  className="w-full rounded-md border bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder:text-gray-600 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#d4af37';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 1px rgba(212,175,55,0.4)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sending || !email}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: '#d4af37', color: '#0a0a0a' }}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    Send code
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

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

              <p className="text-center text-xs text-gray-500">
                Don&apos;t have access?{' '}
                <Link
                  href="/"
                  className="underline-offset-4 hover:underline"
                  style={{ color: '#d4af37' }}
                >
                  Talk to us
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Enter your code
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  We sent a code to{' '}
                  <span className="font-medium text-gray-200">{email}</span>
                </p>
              </div>

              <div
                className="flex justify-between gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={handleOtpChange(idx)}
                    onKeyDown={handleOtpKeyDown(idx)}
                    onPaste={handleOtpPaste}
                    disabled={verifying}
                    aria-label={`Digit ${idx + 1} of ${OTP_LENGTH}`}
                    className="h-14 w-full rounded-md border bg-[#0a0a0a] text-center font-mono text-xl font-semibold text-white transition-colors focus:outline-none disabled:opacity-50"
                    style={{
                      borderColor: digit
                        ? 'rgba(212,175,55,0.5)'
                        : 'rgba(255,255,255,0.08)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d4af37';
                      e.currentTarget.style.boxShadow =
                        '0 0 0 1px rgba(212,175,55,0.5)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = digit
                        ? 'rgba(212,175,55,0.5)'
                        : 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>

              {verifying && (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verifying code…
                </div>
              )}

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

              {info && !error && (
                <p
                  className="rounded-md border px-3 py-2 text-xs"
                  style={{
                    borderColor: 'rgba(212,175,55,0.25)',
                    backgroundColor: 'rgba(212,175,55,0.06)',
                    color: '#d4af37',
                  }}
                >
                  {info}
                </p>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={verifying}
                  className="inline-flex items-center gap-1.5 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || sending || verifying}
                  className="transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: '#d4af37' }}
                >
                  {sending
                    ? 'Sending…'
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-gray-600">
          Secure access · OTP verified
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]" />}>
      <LoginContent />
    </Suspense>
  );
}
