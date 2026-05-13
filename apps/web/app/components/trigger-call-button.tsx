'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';

export default function TriggerCallButton({ leadId }: { leadId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleClick() {
    setState('loading');
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        setState('done');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || state === 'done'}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors
        ${state === 'done' ? 'bg-green-900 text-green-300' :
          state === 'error' ? 'bg-red-900 text-red-300' :
          'bg-dark-tertiary text-gold hover:bg-dark-secondary'}`}
    >
      <Phone className="h-3 w-3" />
      {state === 'loading' ? 'Calling...' :
       state === 'done' ? 'Called!' :
       state === 'error' ? 'Failed' : 'Call'}
    </button>
  );
}
