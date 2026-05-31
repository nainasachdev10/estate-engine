'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

type Status = 'loading' | 'ok' | 'error';

export default function InngestStatus() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;
    // /api/inngest serves the Inngest handler; an HTTP 200 (or 405) means the route is mounted.
    fetch('/api/inngest', { method: 'GET' })
      .then((res) => {
        if (!active) return;
        // Inngest GET returns 200 with introspection JSON when configured; treat 200 as healthy.
        setStatus(res.ok ? 'ok' : 'error');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        checking
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }}
      >
        <Check className="h-3 w-3" />
        connected
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: 'rgba(248,113,113,0.10)', color: '#f87171' }}
    >
      <X className="h-3 w-3" />
      disconnected
    </span>
  );
}
