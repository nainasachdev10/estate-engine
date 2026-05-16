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
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        checking
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[11px] text-green-300">
        <Check className="h-3 w-3" />
        synced
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-[11px] text-red-300">
      <X className="h-3 w-3" />
      unreachable
    </span>
  );
}
