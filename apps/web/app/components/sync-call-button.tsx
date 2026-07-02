'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from './toast-provider';

export default function SyncCallButton({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/voice/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 202 || data.pending) {
        toast.error(data.message ?? 'Call still in progress — try again shortly.');
      } else if (!res.ok) {
        toast.error(data.error ?? 'Could not sync call from Bolna');
      } else {
        toast.success(
          data.recording || data.transcript
            ? 'Synced transcript & recording from Bolna'
            : 'Synced call from Bolna',
        );
        router.refresh();
      }
    } catch {
      toast.error('Network error — could not sync call');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em] transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        color: '#9ca3af',
      }}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      {loading ? 'Syncing...' : 'Sync from Bolna'}
    </button>
  );
}
