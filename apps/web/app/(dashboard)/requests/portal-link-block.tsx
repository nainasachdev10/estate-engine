'use client';

import { useState } from 'react';
import { CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';

export default function PortalLinkBlock({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined' ? `${window.location.origin}/portal/${slug}` : `/portal/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  }

  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-900/15 px-3 py-2.5">
      <CheckCircle className="h-4 w-4 flex-none text-emerald-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
          Portal created
        </p>
        <a
          href={`/portal/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-xs text-emerald-200 hover:text-emerald-100 hover:underline"
        >
          /portal/{slug}
        </a>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex-none rounded-md border border-emerald-500/25 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:border-emerald-500/45 hover:bg-emerald-500/10"
      >
        {copied ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> Copied
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy link
          </span>
        )}
      </button>
      <a
        href={`/portal/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex-none rounded-md border border-emerald-500/25 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:border-emerald-500/45 hover:bg-emerald-500/10"
      >
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> Open
        </span>
      </a>
    </div>
  );
}
