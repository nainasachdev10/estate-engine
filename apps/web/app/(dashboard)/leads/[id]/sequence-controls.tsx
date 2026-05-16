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
      className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
        isPaused
          ? 'bg-green-900 text-green-300 hover:bg-green-800'
          : 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
      }`}
    >
      {loading ? '...' : isPaused ? 'Resume' : 'Pause'}
    </button>
  );
}
