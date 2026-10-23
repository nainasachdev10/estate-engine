'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Signal {
  id: string;
  source: string;
  quote: string;
  url: string | null;
  segment: string | null;
  score: number;
  why: string | null;
  suggested_approach: string | null;
  created_at: string;
}

export default function SignalsPanel({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(id: string, status: 'reviewed' | 'dismissed') {
    setBusyId(id);
    await fetch('/api/signals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
      <h2 className="text-[15px] font-bold text-white">Buyer Signals — Review Pool</h2>
      <p className="text-[12px] leading-relaxed text-gray-500">
        In-market buyers spotted in public discussions, before they fill any form. Hard rule: nothing here is ever
        contacted automatically — you review, then approach properly via consent-based channels.
      </p>

      {signals.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-600">
          Pool is empty. Feed signals via POST /api/signals (manual or a future prospector worker).
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {signals.map((s) => (
            <li key={s.id} className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-black" style={{ color: '#D4AF37' }}>{s.score}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.segment ?? 'unclassified'} · via {s.source}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => review(s.id, 'dismissed')} disabled={busyId === s.id}
                    className="rounded-lg border px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-300 disabled:opacity-50"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Dismiss</button>
                  <button onClick={() => review(s.id, 'reviewed')} disabled={busyId === s.id}
                    className="rounded-lg px-2.5 py-1 text-[10px] font-bold disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>Mark Reviewed</button>
                </div>
              </div>
              <p className="mt-2 text-[13px] italic leading-relaxed text-gray-200">&ldquo;{s.quote}&rdquo;</p>
              {s.why && <p className="mt-1 text-[12px] text-gray-400"><span className="font-bold text-gray-500">Why hot: </span>{s.why}</p>}
              {s.suggested_approach && <p className="text-[12px]" style={{ color: '#D4AF37' }}><span className="font-bold text-gray-500">Approach: </span>{s.suggested_approach}</p>}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-gray-500 underline hover:text-gray-300">
                  Evidence link
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
