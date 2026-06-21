'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface EnvCheckResponse {
  ok: boolean;
  vars: {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
  };
  missingRequired: string[];
}

interface EnvState {
  loading: boolean;
  data: EnvCheckResponse | null;
  error: string | null;
}

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Core', keys: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'] },
  { title: 'Voice — Bolna', keys: ['BOLNA_API_KEY', 'BOLNA_AGENT_ID', 'BOLNA_FROM_NUMBER', 'BOLNA_WEBHOOK_SECRET'] },
  { title: 'WhatsApp — AiSensy', keys: ['AISENSY_API_KEY', 'AISENSY_SENDER_ID', 'AISENSY_WEBHOOK_SECRET'] },
  { title: 'Email — Brevo', keys: ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL'] },
  { title: 'Meta Ads & Lead Ads', keys: ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_PAGE_ID', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN', 'META_PAGE_ACCESS_TOKEN', 'META_IG_BUSINESS_ID'] },
  { title: 'Ad Creatives — Higgsfield', keys: ['HIGGSFIELD_API_KEY'] },
  { title: 'Admin', keys: ['ADMIN_EMAILS', 'APP_URL'] },
];

const OPTIONAL_KEYS = ['AYRSHARE_API_KEY', 'POSTIZ_API_KEY', 'INNGEST_EVENT_KEY', 'NEXT_PUBLIC_POSTHOG_KEY', 'SARVAM_API_KEY', 'SLACK_WEBHOOK_URL'];

const ENV_LABELS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anon key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
  ANTHROPIC_API_KEY: 'Anthropic (Claude) API key',
  BOLNA_API_KEY: 'Bolna API key',
  BOLNA_AGENT_ID: 'Bolna agent ID',
  BOLNA_FROM_NUMBER: 'Bolna outbound caller ID',
  BOLNA_WEBHOOK_SECRET: 'Bolna webhook signature secret',
  AISENSY_API_KEY: 'AiSensy API key',
  AISENSY_SENDER_ID: 'AiSensy sender ID',
  AISENSY_WEBHOOK_SECRET: 'AiSensy webhook signature secret',
  BREVO_API_KEY: 'Brevo API key',
  BREVO_SENDER_EMAIL: 'Brevo verified sender email',
  META_ACCESS_TOKEN: 'Meta Marketing API access token',
  META_AD_ACCOUNT_ID: 'Meta ad account ID',
  META_PAGE_ID: 'Meta Page ID',
  META_APP_SECRET: 'Meta app secret (webhook signing)',
  META_WEBHOOK_VERIFY_TOKEN: 'Meta webhook verify token',
  META_PAGE_ACCESS_TOKEN: 'Meta Page access token (lead ads, posting)',
  META_IG_BUSINESS_ID: 'Instagram Business account ID',
  HIGGSFIELD_API_KEY: 'Higgsfield API key (image/video gen)',
  ADMIN_EMAILS: 'Admin email allowlist',
  APP_URL: 'Public app URL',
  AYRSHARE_API_KEY: 'Ayrshare social scheduler key',
  POSTIZ_API_KEY: 'Postiz social scheduler key',
  INNGEST_EVENT_KEY: 'Inngest event key',
  NEXT_PUBLIC_POSTHOG_KEY: 'PostHog analytics key',
  SARVAM_API_KEY: 'Sarvam multilingual STT/TTS key',
  SLACK_WEBHOOK_URL: 'Slack alerts (stuck leads)',
};

function Row({ name, ok }: { name: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-3 px-6 py-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="flex h-6 w-6 flex-none items-center justify-center">
        {ok ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[12px] text-white">{name}</p>
        <p className="text-[11px] text-gray-600">{ENV_LABELS[name] ?? ''}</p>
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
}

function GroupHeader({ title }: { title: string }) {
  return (
    <li className="px-6 pb-1 pt-4 first:pt-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{title}</p>
    </li>
  );
}

export default function EnvChecklist() {
  const [state, setState] = useState<EnvState>({ loading: true, data: null, error: null });

  useEffect(() => {
    let active = true;
    fetch('/api/settings/env-check')
      .then((r) => r.json())
      .then((d: EnvCheckResponse) => {
        if (!active) return;
        setState({ loading: false, data: d, error: null });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, data: null, error: 'Could not check env vars' });
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

  if (state.error || !state.data) {
    return <p className="px-6 py-5 text-[13px] text-red-400">{state.error ?? 'Could not check env vars'}</p>;
  }

  const { required, optional } = state.data.vars;
  const requiredEntries = Object.entries(required);
  const configured = requiredEntries.filter(([, ok]) => ok).length;
  const total = requiredEntries.length;
  const allOk = configured === total;
  const pct = Math.round((configured / Math.max(total, 1)) * 100);

  return (
    <div>
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          {configured} of {total} required configured
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

      <ul className="divide-y" style={{ ['--tw-divide-opacity' as string]: 1 }}>
        {GROUPS.flatMap((group) => [
          <GroupHeader key={`h-${group.title}`} title={group.title} />,
          ...group.keys
            .filter((key) => key in required)
            .map((key) => <Row key={key} name={key} ok={required[key]} />),
        ])}
        <GroupHeader key="h-optional" title="Optional" />
        {OPTIONAL_KEYS.filter((key) => key in optional).map((key) => (
          <Row key={key} name={key} ok={optional[key]} />
        ))}
      </ul>
    </div>
  );
}
