'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface EnvState {
  loading: boolean;
  vars: Record<string, boolean>;
  error: string | null;
}

const ENV_LABELS: Record<string, string> = {
  ANTHROPIC_API_KEY: 'Anthropic (Claude) API key',
  BOLNA_API_KEY: 'Bolna voice agent — API key',
  BOLNA_AGENT_ID: 'Bolna voice agent — agent ID',
  AISENSY_API_KEY: 'AiSensy (WhatsApp) API key',
  BREVO_API_KEY: 'Brevo (Sendinblue) — email',
  INNGEST_EVENT_KEY: 'Inngest event key',
  POSTHOG_KEY: 'PostHog (server)',
  NEXT_PUBLIC_POSTHOG_KEY: 'PostHog (client)',
  NEXT_PUBLIC_APP_URL: 'Public APP URL',
};

const ORDER = [
  'ANTHROPIC_API_KEY',
  'BOLNA_API_KEY',
  'BOLNA_AGENT_ID',
  'AISENSY_API_KEY',
  'BREVO_API_KEY',
  'INNGEST_EVENT_KEY',
  'POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_APP_URL',
];

export default function EnvChecklist() {
  const [state, setState] = useState<EnvState>({ loading: true, vars: {}, error: null });

  useEffect(() => {
    let active = true;
    fetch('/api/settings/env-check')
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setState({ loading: false, vars: d.vars ?? {}, error: null });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, vars: {}, error: 'Could not check env vars' });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-5 text-[13px] text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking environment...
      </div>
    );
  }

  if (state.error) {
    return <p className="px-6 py-5 text-[13px] text-red-400">{state.error}</p>;
  }

  const configured = Object.values(state.vars).filter(Boolean).length;
  const total = Object.keys(state.vars).length;
  const allOk = configured === total;
  const pct = Math.round((configured / Math.max(total, 1)) * 100);

  return (
    <div>
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          {configured} of {total} configured
        </p>
        <span
          className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold"
          style={
            allOk
              ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
              : { backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24' }
          }
        >
          {pct}%
        </span>
      </div>

      <ul
        className="divide-y"
        style={{ ['--tw-divide-opacity' as string]: 1 }}
      >
        {ORDER.filter((k) => k in state.vars).map((key) => {
          const ok = state.vars[key];
          return (
            <li
              key={key}
              className="flex items-center gap-3 px-6 py-3"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex h-6 w-6 flex-none items-center justify-center">
                {ok ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] text-white">{key}</p>
                <p className="text-[11px] text-gray-600">{ENV_LABELS[key] ?? ''}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={
                  ok
                    ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
                    : { backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' }
                }
              >
                {ok ? 'configured' : 'missing'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
