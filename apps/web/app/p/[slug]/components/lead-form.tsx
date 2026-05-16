'use client';

import { useState, useTransition } from 'react';
import { usePostHog } from 'posthog-js/react';

type Variant = 'luxury' | 'premium' | 'plot';

interface Props {
  projectId: string;
  slug: string;
  variant: Variant;
  ctaLabel?: string;
}

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

function readUtm(): UtmParams {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const out: UtmParams = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const v = sp.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export default function LeadForm({ projectId, slug, variant, ctaLabel }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const posthog = usePostHog();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const utm = readUtm();
    posthog?.capture('lead_form_submit', { slug, variant, ...utm });

    startTransition(async () => {
      try {
        const res = await fetch('/api/leads/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            phone: phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`,
            email: email || undefined,
            project_id: projectId,
            source: 'organic',
            source_meta: { source_type: 'landing', slug, ...utm },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          posthog?.capture('lead_form_error', { slug, error: data?.error });
          setErrorMsg(data?.error ?? 'Could not submit. Please try again.');
          setStatus('error');
          return;
        }
        posthog?.capture('lead_form_success', { slug, variant, leadId: data.leadId, ...utm });
        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Network error');
        setStatus('error');
      }
    });
  }

  // ─── Visual variants ────────────────────────────────────────────────────────

  if (status === 'success') {
    const successClasses =
      variant === 'luxury'
        ? 'border border-[#d4af37]/40 bg-black/70 text-white'
        : variant === 'plot'
        ? 'border border-emerald-300 bg-white text-emerald-900'
        : 'border border-slate-200 bg-white text-slate-900';
    return (
      <div className={`rounded-xl ${successClasses} p-8 text-center shadow-lg`}>
        <div className="mb-3 text-3xl">✓</div>
        <p className="text-lg font-semibold">Aapko 2 minute mein call aayegi</p>
        <p className="mt-2 text-sm opacity-80">
          Hum aapko {phone.replace(/(\d{2})\d{4}(\d{4})/, '+91 $1•••• $2')} pe call karenge.
        </p>
      </div>
    );
  }

  const inputBase =
    variant === 'luxury'
      ? 'bg-black/40 border-[#d4af37]/30 text-white placeholder:text-white/40 focus:border-[#d4af37]'
      : variant === 'plot'
      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-900';

  const buttonClasses =
    variant === 'luxury'
      ? 'bg-[#d4af37] text-black hover:bg-[#c9a137]'
      : variant === 'plot'
      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
      : 'bg-slate-900 text-white hover:bg-slate-800';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="sr-only" htmlFor="lf-name">Full name</label>
        <input
          id="lf-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className={`w-full rounded-lg border px-4 py-3 outline-none transition ${inputBase}`}
        />
      </div>

      <div className="flex">
        <span
          className={`inline-flex items-center rounded-l-lg border border-r-0 px-3 text-sm ${
            variant === 'luxury'
              ? 'border-[#d4af37]/30 bg-black/40 text-white/60'
              : variant === 'plot'
              ? 'border-slate-300 bg-slate-50 text-slate-500'
              : 'border-slate-300 bg-slate-50 text-slate-500'
          }`}
        >
          +91
        </span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="10-digit mobile"
          className={`w-full rounded-r-lg border px-4 py-3 outline-none transition ${inputBase}`}
        />
      </div>

      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className={`w-full rounded-lg border px-4 py-3 outline-none transition ${inputBase}`}
        />
      </div>

      {errorMsg && (
        <p className={variant === 'luxury' ? 'text-sm text-red-300' : 'text-sm text-red-600'}>
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full rounded-lg px-6 py-3 font-semibold transition disabled:opacity-60 ${buttonClasses}`}
      >
        {isPending ? 'Submitting...' : ctaLabel ?? 'Schedule Private Viewing'}
      </button>

      <p
        className={`text-center text-xs ${
          variant === 'luxury' ? 'text-white/40' : 'text-slate-500'
        }`}
      >
        By submitting, you agree to be contacted by phone, WhatsApp and email about this project.
      </p>
    </form>
  );
}
