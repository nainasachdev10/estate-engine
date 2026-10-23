'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientLite { id: string; name: string; brand_name: string | null }

const INPUT = 'w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] text-white outline-none focus:border-[#D4AF37]';
const STYLE = { borderColor: 'rgba(255,255,255,0.1)' };

export default function PartnerForm({ clients }: { clients: ClientLite[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ client_id: clients[0]?.id ?? '', name: '', firm_name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function create() {
    setError(null);
    setCreatedCode(null);
    if (!form.client_id || !form.name.trim()) { setError('Client and name are required'); return; }
    setBusy(true);
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: form.client_id,
        name: form.name.trim(),
        firm_name: form.firm_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? 'Create failed');
    else {
      setCreatedCode(data.cp_code);
      setForm((f) => ({ ...f, name: '', firm_name: '', phone: '', email: '' }));
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="h-fit rounded-2xl border p-6" style={{ backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.07)' }}>
      <h2 className="text-[15px] font-bold text-white">Register Partner</h2>
      <p className="mt-1 text-[12px] text-gray-500">
        Each partner gets a permanent share code. Any lead arriving through their link is theirs — forever, no disputes.
      </p>

      <div className="mt-5 space-y-3">
        <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className={INPUT} style={STYLE}>
          {clients.map((c) => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.brand_name ?? c.name}</option>)}
        </select>
        <input placeholder="Partner name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} style={STYLE} />
        <input placeholder="Firm (optional)" value={form.firm_name} onChange={(e) => setForm((f) => ({ ...f, firm_name: e.target.value }))} className={INPUT} style={STYLE} />
        <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} style={STYLE} />
        <input placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} style={STYLE} />
      </div>

      {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}
      {createdCode && (
        <p className="mt-3 rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'rgba(34,197,94,0.3)', color: '#22c55e' }}>
          Registered ✓ — share code: <span className="font-mono font-bold">{createdCode}</span>
        </p>
      )}

      <button onClick={create} disabled={busy}
        className="mt-5 w-full rounded-xl px-5 py-2.5 text-[13px] font-bold transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#D4AF37', color: '#000' }}>
        {busy ? 'Registering…' : 'Register Partner'}
      </button>
    </div>
  );
}
