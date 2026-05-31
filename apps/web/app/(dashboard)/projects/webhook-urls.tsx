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
    <div className="flex items-center gap-2 rounded border border-dark-tertiary bg-dark-bg px-2 py-1.5">
      <span className="w-16 shrink-0 text-[9px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="flex-1 truncate font-mono text-[10px] text-gray-400">{url}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded p-0.5 text-gray-500 transition hover:text-gold"
        title="Copy URL"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

export default function WebhookUrls({ projectId, publicSlug, appUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-dark-tertiary pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-gray-600 transition hover:text-gold"
      >
        {open ? '▲ Hide' : '▼ Webhook URLs'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {publicSlug && (
            <CopyRow label="Landing" url={`${appUrl}/p/${publicSlug}`} />
          )}
          <CopyRow label="Meta" url={`${appUrl}/api/leads/meta-webhook?project_id=${projectId}`} />
          <CopyRow label="99acres" url={`${appUrl}/api/leads/99acres-webhook?project_id=${projectId}`} />
          <CopyRow label="Google" url={`${appUrl}/api/leads/google-webhook?project_id=${projectId}`} />
        </div>
      )}
    </div>
  );
}
