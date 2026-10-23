'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CostSheetPanel from './cost-sheet-panel';

export interface Unit {
  id: string;
  tower: string;
  floor: number;
  unit_number: string;
  config: string;
  saleable_sqft: number;
  is_penthouse: boolean;
  status: 'available' | 'held' | 'booked' | 'registered';
}

const STATUS_COLOR: Record<Unit['status'], string> = {
  available: '#22c55e',
  held: '#eab308',
  booked: '#D4AF37',
  registered: '#818cf8',
};

export default function UnitsPanel({ projectId, units, hasRateCard }: { projectId: string; units: Unit[]; hasRateCard: boolean }) {
  const router = useRouter();
  const [showBulk, setShowBulk] = useState(units.length === 0);
  const [bulkText, setBulkText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetUnit, setSheetUnit] = useState<Unit | null>(null);

  async function bulkAdd() {
    setBusy(true);
    setError(null);
    // CSV: tower,floor,unit_number,config,saleable_sqft[,penthouse]
    const rows = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    for (const line of rows) {
      const [tower, floor, unit_number, config, sqft, ph] = line.split(',').map((s) => s?.trim());
      if (!tower || !floor || !unit_number || !config || !sqft) {
        setError(`Bad line: "${line}" — expected tower,floor,unit_number,config,sqft[,penthouse]`);
        setBusy(false);
        return;
      }
      parsed.push({
        tower, unit_number, config,
        floor: Number(floor),
        saleable_sqft: Number(sqft),
        is_penthouse: (ph ?? '').toLowerCase() === 'penthouse',
      });
    }
    const res = await fetch('/api/inventory/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, units: parsed }),
    });
    if (!res.ok) setError((await res.json()).error ?? 'Upload failed');
    else { setBulkText(''); setShowBulk(false); router.refresh(); }
    setBusy(false);
  }

  async function setStatus(id: string, status: Unit['status']) {
    await fetch('/api/inventory/units', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-white">Unit Matrix</h2>
          <p className="text-[12px] text-gray-500">{units.length} units · click a unit for its instant cost sheet</p>
        </div>
        <button onClick={() => setShowBulk((v) => !v)}
          className="rounded-xl border px-4 py-2 text-[12px] font-bold text-gray-300 transition hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {showBulk ? 'Close' : '+ Add Units'}
        </button>
      </div>

      {showBulk && (
        <div className="mb-5 rounded-xl border p-4" style={{ borderColor: 'rgba(212,175,55,0.2)', backgroundColor: 'rgba(212,175,55,0.04)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
            One unit per line: tower,floor,unit_number,config,sqft[,penthouse]
          </p>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6}
            placeholder={'E,25,E-2501,4BHK B,3490\nE,25,E-2502,4BHK B,3490\nE,40,E-4001,Duplex Penthouse,6200,penthouse'}
            className="w-full rounded-lg border bg-transparent p-3 font-mono text-[12px] text-white outline-none focus:border-[#D4AF37]"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
          <button onClick={bulkAdd} disabled={busy || !bulkText.trim()}
            className="mt-3 rounded-xl px-5 py-2 text-[12px] font-bold disabled:opacity-50"
            style={{ backgroundColor: '#D4AF37', color: '#000' }}>
            {busy ? 'Uploading…' : 'Upload Units'}
          </button>
        </div>
      )}

      {units.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-600">No units yet — paste the unit matrix above.</p>
      ) : (
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
                <th className="pb-2 pr-3">Unit</th><th className="pb-2 pr-3">Tower</th>
                <th className="pb-2 pr-3">Floor</th><th className="pb-2 pr-3">Config</th>
                <th className="pb-2 pr-3">Sq ft</th><th className="pb-2 pr-3">Status</th><th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="py-2.5 pr-3 font-mono text-white">
                    {u.unit_number}
                    {u.is_penthouse && (
                      <span className="ml-2 rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>PH · human-only</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-400">{u.tower}</td>
                  <td className="py-2.5 pr-3 text-gray-400">{u.floor}</td>
                  <td className="py-2.5 pr-3 text-gray-300">{u.config}</td>
                  <td className="py-2.5 pr-3 font-mono text-gray-300">{u.saleable_sqft.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 pr-3">
                    <select value={u.status} onChange={(e) => setStatus(u.id, e.target.value as Unit['status'])}
                      className="rounded-md border bg-transparent px-1.5 py-1 text-[11px] font-bold outline-none"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: STATUS_COLOR[u.status] }}>
                      {(['available', 'held', 'booked', 'registered'] as const).map((s) => (
                        <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => setSheetUnit(u)} disabled={!hasRateCard}
                      title={hasRateCard ? 'Generate cost sheet' : 'Save a rate card first'}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-bold transition hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                      Cost Sheet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheetUnit && <CostSheetPanel unit={sheetUnit} onClose={() => setSheetUnit(null)} />}
    </div>
  );
}
