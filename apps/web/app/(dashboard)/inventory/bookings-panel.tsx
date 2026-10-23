'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  buyer_name: string;
  agreement_value_rupees: number;
  booking_date: string;
  project_units: { unit_number: string } | { unit_number: string }[] | null;
  channel_partners: { name: string } | { name: string }[] | null;
}
interface UnitOption { id: string; unit_number: string; config: string; status: string }
export interface BookingPrefill { leadId: string; buyerName: string }

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

/** Bookings close the acquisition loop: unit blocked, value recorded, CP credited. */
export default function BookingsPanel({ projectId, bookings, prefill = null }: {
  projectId: string; bookings: Booking[]; prefill?: BookingPrefill | null;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(Boolean(prefill));
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [form, setForm] = useState({ unit_id: '', buyer_name: prefill?.buyerName ?? '', value_cr: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showAdd) return;
    fetch(`/api/inventory/units?project_id=${projectId}`)
      .then((r) => r.json())
      .then((d) => setUnits((d.units ?? []).filter((u: UnitOption) => u.status === 'available' || u.status === 'held')))
      .catch(() => setUnits([]));
  }, [showAdd, projectId]);

  async function create() {
    setError(null);
    const valueRupees = Math.round(parseFloat(form.value_cr) * 1e7);
    if (!form.unit_id || !form.buyer_name.trim() || !Number.isFinite(valueRupees) || valueRupees <= 0) {
      setError('Unit, buyer name and value (₹ Cr) are required');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        unit_id: form.unit_id,
        buyer_name: form.buyer_name.trim(),
        agreement_value_rupees: valueRupees,
        ...(prefill?.leadId ? { lead_id: prefill.leadId } : {}),
      }),
    });
    if (!res.ok) setError((await res.json()).error ?? 'Create failed');
    else { setShowAdd(false); setForm({ unit_id: '', buyer_name: '', value_cr: '' }); router.refresh(); }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-white">Bookings</h2>
          <p className="text-[12px] text-gray-500">Blocks the unit and credits the channel partner — post-sale accounting stays in your own systems</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)}
          className="rounded-xl border px-4 py-2 text-[12px] font-bold text-gray-300 hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {showAdd ? 'Close' : '+ New Booking'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-5 grid gap-2 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: 'rgba(212,175,55,0.2)', backgroundColor: 'rgba(212,175,55,0.04)' }}>
          <select value={form.unit_id} onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
            className="rounded-lg border bg-transparent px-2 py-2 text-[12px] text-white" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <option value="" style={{ color: '#000' }}>Unit…</option>
            {units.map((u) => <option key={u.id} value={u.id} style={{ color: '#000' }}>{u.unit_number} · {u.config}</option>)}
          </select>
          <input placeholder="Buyer name" value={form.buyer_name}
            onChange={(e) => setForm((f) => ({ ...f, buyer_name: e.target.value }))}
            className="rounded-lg border bg-transparent px-2 py-2 text-[12px] text-white" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <input placeholder="Value (₹ Cr, e.g. 3.68)" value={form.value_cr}
            onChange={(e) => setForm((f) => ({ ...f, value_cr: e.target.value }))}
            className="rounded-lg border bg-transparent px-2 py-2 text-[12px] text-white" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <button onClick={create} disabled={busy}
            className="rounded-lg px-3 py-2 text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: '#D4AF37', color: '#000' }}>
            {busy ? 'Creating…' : 'Create Booking'}
          </button>
          {error && <p className="col-span-full text-[12px] text-red-400">{error}</p>}
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-gray-600">No bookings yet — they appear here when deals close.</p>
      ) : (
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
              <th className="pb-2 pr-3">Buyer</th><th className="pb-2 pr-3">Unit</th>
              <th className="pb-2 pr-3">Value</th><th className="pb-2 pr-3">Via CP</th><th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <td className="py-2.5 pr-3 text-white">{b.buyer_name}</td>
                <td className="py-2.5 pr-3 font-mono text-gray-300">{one(b.project_units)?.unit_number ?? '—'}</td>
                <td className="py-2.5 pr-3 font-mono" style={{ color: '#D4AF37' }}>₹{(b.agreement_value_rupees / 1e7).toFixed(2)} Cr</td>
                <td className="py-2.5 pr-3 text-gray-400">{one(b.channel_partners)?.name ?? '—'}</td>
                <td className="py-2.5 font-mono text-[11px] text-gray-500">{b.booking_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
