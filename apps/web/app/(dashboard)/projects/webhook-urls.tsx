'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  projectId: string;
  publicSlug: string | null;
  appUrl: string;
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{label}</span>
      <span className="flex-1 truncate font-mono text-[12px] text-gray-400">{url}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-md p-1 text-gray-500 transition-colors hover:text-[#D4AF37]"
        title="Copy URL"
      >
        {copied ? <Check className="h-3.5 w-3.5" style={{ color: '#34d399' }} /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function WebhookUrls({ projectId, publicSlug, appUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-colors hover:text-[#D4AF37]"
      >
        {open ? '▲ Hide Webhook URLs' : '▼ Show Webhook URLs'}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {publicSlug && (
            <CopyRow label="Landing" url={`${appUrl}/p/${publicSlug}`} />
          )}
          <CopyRow label="99acres" url={`${appUrl}/api/leads/99acres-webhook?project_id=${projectId}`} />
          <CopyRow label="Google" url={`${appUrl}/api/leads/google-webhook?project_id=${projectId}`} />
          <p className="px-1 text-[11px] leading-relaxed text-gray-600">
            Meta Lead Ads use a single account-wide webhook (configured once in
            Settings → Platform). To route a lead form to this project, set its{' '}
            <span className="font-mono text-gray-400">Lead form ID</span> on the
            matching campaign in Campaigns.
          </p>
        </div>
      )}
    </div>
  );
}
