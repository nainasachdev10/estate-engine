'use client';

import { useState } from 'react';

export default function SequenceControls({ leadId, paused }: { leadId: string; paused: boolean }) {
  const [isPaused, setIsPaused] = useState(paused);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/leads/${leadId}/sequence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !isPaused }),
      });
      setIsPaused(!isPaused);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded-xl px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.10em] transition-all hover:opacity-85 disabled:opacity-60"
      style={
        isPaused
          ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
          : { backgroundColor: 'rgba(251,191,36,0.10)', color: '#fbbf24' }
      }
    >
      {loading ? '...' : isPaused ? 'Resume' : 'Pause'}
    </button>
  );
}
