'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivateButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function activate() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={activate}
      disabled={loading}
      className="mt-auto rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ backgroundColor: '#D4AF37', color: '#000' }}
    >
      {loading ? 'Activating…' : 'Activate Project'}
    </button>
  );
}
