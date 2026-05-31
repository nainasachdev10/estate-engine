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
    <div
      className="mt-4 flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ backgroundColor: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      <CheckCircle className="h-4 w-4 flex-none" style={{ color: '#D4AF37' }} />
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: '#D4AF37' }}
        >
          Portal created
        </p>
        <a
          href={`/portal/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-[12px] text-gray-300 hover:text-white hover:underline"
        >
          /portal/{slug}
        </a>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex-none rounded-lg border px-2.5 py-1.5 text-[11px] font-mono text-gray-400 transition-all hover:text-white"
        style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        {copied ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" style={{ color: '#34d399' }} /> Copied
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy
          </span>
        )}
      </button>
      <a
        href={`/portal/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex-none rounded-lg border px-2.5 py-1.5 text-[11px] font-mono text-gray-400 transition-all hover:text-white"
        style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <span className="inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> Open
        </span>
      </a>
    </div>
  );
}
