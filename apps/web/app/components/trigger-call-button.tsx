'use client';

import { useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { useToast } from './toast-provider';

export default function TriggerCallButton({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/voice/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error ?? 'Could not trigger call');
      } else {
        toast.success(
          leadName ? `Call queued for ${leadName.split(' ')[0]}` : 'Voice agent dispatched',
        );
      }
    } catch {
      toast.error('Network error — could not trigger call');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: 'rgba(212,175,55,0.28)',
        backgroundColor: 'rgba(212,175,55,0.10)',
        color: '#D4AF37',
      }}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
      {loading ? 'Calling...' : 'Call'}
    </button>
  );
}
