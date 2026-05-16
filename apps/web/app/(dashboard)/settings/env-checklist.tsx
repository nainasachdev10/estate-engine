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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking environment...
      </div>
    );
  }

  if (state.error) {
    return <p className="text-sm text-red-400">{state.error}</p>;
  }

  const configured = Object.values(state.vars).filter(Boolean).length;
  const total = Object.keys(state.vars).length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-dark-tertiary pb-3">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          {configured} of {total} configured
        </p>
        <p
          className={`font-mono text-xs ${configured === total ? 'text-green-400' : 'text-yellow-400'}`}
        >
          {Math.round((configured / Math.max(total, 1)) * 100)}%
        </p>
      </div>

      <ul className="space-y-1.5">
        {ORDER.filter((k) => k in state.vars).map((key) => {
          const ok = state.vars[key];
          return (
            <li
              key={key}
              className="flex items-center justify-between rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-gray-200">{key}</p>
                <p className="text-[11px] text-gray-500">{ENV_LABELS[key] ?? ''}</p>
              </div>
              {ok ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[11px] text-green-300">
                  <Check className="h-3 w-3" />
                  configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-[11px] text-red-300">
                  <X className="h-3 w-3" />
                  missing
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
