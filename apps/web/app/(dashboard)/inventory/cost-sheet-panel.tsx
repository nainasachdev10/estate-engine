'use client';

import { useEffect, useState } from 'react';
import type { Unit } from './units-panel';

interface Line { label: string; calc: string; amount_rupees: number }
interface Sheet {
  lines: Line[];
  total_consideration_rupees: number;
  possession_lines: Line[];
  parking_note: string;
  statutory_note: string;
  demo_rate: boolean;
}

const inr = (v: number) => `₹ ${Math.round(v).toLocaleString('en-IN')}`;

export default function CostSheetPanel({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/costsheet?unit_id=${unit.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        if (d.sheet) { setSheet(d.sheet); setText(d.text); }
        else setError(d.error ?? 'Failed to generate');
      })
      .catch(() => live && setError('Failed to generate'));
    return () => { live = false; };
  }, [unit.id]);

  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border p-6" onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: '#141416', borderColor: 'rgba(212,175,55,0.25)' }}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#D4AF37' }}>
              Cost Sheet · generated in seconds, zero arithmetic risk
            </p>
            <h3 className="mt-1 font-mono text-lg font-bold text-white">
              {unit.unit_number} · Tower {unit.tower} · {unit.config}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 transition hover:text-white">✕</button>
        </div>

        {error && <p className="py-6 text-center text-[13px] text-red-400">{error}</p>}
        {!sheet && !error && <p className="py-6 text-center text-[13px] text-gray-500">Computing…</p>}

        {sheet && (
          <>
            {unit.is_penthouse && (
              <p className="mb-3 rounded-lg border px-3 py-2 text-[12px]"
                style={{ borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.06)' }}>
                Penthouse — hard rule: never handled by AI conversation. Share this sheet via your senior closer only.
              </p>
            )}
            <div className="rounded-xl p-4 font-mono text-[12.5px] leading-relaxed" style={{ backgroundColor: '#0E0E10' }}>
              {sheet.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-2 py-0.5">
                  <span className="text-gray-400">{l.label}</span>
                  <span className="text-gray-600">{l.calc}</span>
                  <span className="text-white">{inr(l.amount_rupees)}</span>
                </div>
              ))}
              <div className="my-2 border-t" style={{ borderColor: 'rgba(212,175,55,0.3)' }} />
              <div className="flex justify-between py-0.5 font-bold">
                <span style={{ color: '#D4AF37' }}>TOTAL CONSIDERATION</span>
                <span style={{ color: '#D4AF37' }}>{inr(sheet.total_consideration_rupees)}</span>
              </div>
              {sheet.possession_lines.length > 0 && (
                <>
                  <p className="mt-3 text-gray-500">Payable at possession (separate):</p>
                  {sheet.possession_lines.map((l) => (
                    <div key={l.label} className="flex justify-between gap-2 py-0.5">
                      <span className="text-gray-400">{l.label}</span>
                      <span className="text-gray-600">{l.calc}</span>
                      <span className="text-gray-200">{inr(l.amount_rupees)}</span>
                    </div>
                  ))}
                </>
              )}
              <p className="mt-3 text-gray-500">{sheet.parking_note}</p>
              <p className="text-gray-500">{sheet.statutory_note}</p>
              {sheet.demo_rate && <p className="mt-1 text-gray-600">*Demonstration rate — final as per official rate card.</p>}
            </div>

            <button onClick={copy}
              className="mt-4 w-full rounded-xl px-5 py-2.5 text-[13px] font-bold transition hover:opacity-90"
              style={{ backgroundColor: '#D4AF37', color: '#000' }}>
              {copied ? 'Copied ✓' : 'Copy as WhatsApp text (CP desk)'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
