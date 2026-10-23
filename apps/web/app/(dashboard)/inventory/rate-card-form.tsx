'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INPUT = 'w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] text-white outline-none focus:border-[#D4AF37]';
const INPUT_STYLE = { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' };
const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600';

interface RateCard {
  base_rate_rupees?: number;
  dev_charges_rupees?: number;
  floor_rise_per_floor_rupees?: number;
  floor_rise_from_floor?: number;
  maintenance_deposit_rupees?: number;
  advance_maintenance_rupees?: number;
  advance_maintenance_years?: number;
  parking_slots_included?: number;
  is_demo_rate?: boolean;
}

export default function RateCardForm({ projectId, rateCard }: { projectId: string; rateCard: RateCard | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    base_rate_rupees: rateCard?.base_rate_rupees ?? 9500,
    dev_charges_rupees: rateCard?.dev_charges_rupees ?? 700,
    floor_rise_per_floor_rupees: rateCard?.floor_rise_per_floor_rupees ?? 14,
    floor_rise_from_floor: rateCard?.floor_rise_from_floor ?? 0,
    maintenance_deposit_rupees: rateCard?.maintenance_deposit_rupees ?? 100,
    advance_maintenance_rupees: rateCard?.advance_maintenance_rupees ?? 85,
    advance_maintenance_years: rateCard?.advance_maintenance_years ?? 2,
    parking_slots_included: rateCard?.parking_slots_included ?? 2,
    is_demo_rate: rateCard?.is_demo_rate ?? true,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'is_demo_rate' ? e.target.checked : Number(e.target.value) }));

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/inventory/rate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, ...form }),
    });
    if (!res.ok) setError((await res.json()).error ?? 'Save failed');
    else router.refresh();
    setSaving(false);
  }

  const fields: Array<{ key: keyof typeof form; label: string }> = [
    { key: 'base_rate_rupees', label: 'Base rate (₹/sq ft)' },
    { key: 'dev_charges_rupees', label: 'Dev & infra (₹/sq ft)' },
    { key: 'floor_rise_per_floor_rupees', label: 'Floor-rise (₹/sq ft/floor)' },
    { key: 'floor_rise_from_floor', label: 'Floor-rise starts above floor' },
    { key: 'maintenance_deposit_rupees', label: 'Maintenance deposit (₹/sq ft)' },
    { key: 'advance_maintenance_rupees', label: 'Advance maintenance (₹/sq ft)' },
    { key: 'advance_maintenance_years', label: 'Advance maintenance years' },
    { key: 'parking_slots_included', label: 'Car parks included' },
  ];

  return (
    <div className="h-fit rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
      <h2 className="text-[15px] font-bold text-white">Rate Card</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
        Every cost sheet is computed from these numbers — integers, ₹ per sq ft.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className={LABEL}>{f.label}</label>
            <input type="number" value={form[f.key] as number} onChange={set(f.key)} className={INPUT} style={INPUT_STYLE} />
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-[12px] text-gray-400">
        <input type="checkbox" checked={form.is_demo_rate} onChange={set('is_demo_rate')} className="accent-[#D4AF37]" />
        Demonstration rate (cost sheets carry a * disclaimer until the official card lands)
      </label>

      {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}

      <button onClick={save} disabled={saving}
        className="mt-5 w-full rounded-xl px-5 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#D4AF37', color: '#000' }}>
        {saving ? 'Saving…' : 'Save Rate Card'}
      </button>
    </div>
  );
}
