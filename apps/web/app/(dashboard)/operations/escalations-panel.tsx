'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Escalation {
  id: string;
  kind: 'discount' | 'complaint' | 'penthouse' | 'uncertain';
  detail: string | null;
  brief: { who?: string; what_they_want?: string; say_first?: string } | null;
  created_at: string;
  leads: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
}

const KIND_STYLE: Record<Escalation['kind'], { label: string; color: string }> = {
  discount: { label: 'Discount talk', color: '#eab308' },
  complaint: { label: 'Complaint', color: '#f87171' },
  penthouse: { label: 'Penthouse', color: '#D4AF37' },
  uncertain: { label: 'Needs judgment', color: '#818cf8' },
};

export default function EscalationsPanel({ escalations }: { escalations: Escalation[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handled(id: string) {
    setBusyId(id);
    await fetch('/api/escalations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.18)' }}>
      <h2 className="text-[15px] font-bold text-white">Human Handover Queue</h2>
      <p className="text-[12px] text-gray-500">
        Hard rules tripped these — the AI stopped replying and briefed you instead. Take them personally.
      </p>

      {escalations.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-600">Nothing waiting. Discount, complaint and penthouse conversations land here the moment they happen.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {escalations.map((e) => {
            const lead = Array.isArray(e.leads) ? e.leads[0] : e.leads;
            const style = KIND_STYLE[e.kind];
            return (
              <li key={e.id} className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${style.color}22`, color: style.color }}>{style.label}</span>
                    {lead && (
                      <Link href={`/leads/${lead.id}`} className="text-[13px] font-bold text-white hover:underline">
                        {lead.full_name}
                      </Link>
                    )}
                    <span className="text-[10px] text-gray-600">{new Date(e.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button onClick={() => handled(e.id)} disabled={busyId === e.id}
                    className="flex-none rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                    {busyId === e.id ? '…' : 'Mark Handled'}
                  </button>
                </div>
                {e.brief && (
                  <div className="mt-2.5 space-y-1 rounded-lg p-3 text-[12px] leading-relaxed" style={{ backgroundColor: '#0E0E10' }}>
                    {e.brief.who && <p className="text-gray-300"><span className="font-bold text-gray-500">Who: </span>{e.brief.who}</p>}
                    {e.brief.what_they_want && <p className="text-gray-300"><span className="font-bold text-gray-500">They want: </span>{e.brief.what_they_want}</p>}
                    {e.brief.say_first && <p style={{ color: '#D4AF37' }}><span className="font-bold text-gray-500">Say first: </span>{e.brief.say_first}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
