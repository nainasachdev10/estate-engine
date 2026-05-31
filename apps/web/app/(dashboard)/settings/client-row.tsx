'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { useToast } from '../../components/toast-provider';

export interface ClientLite {
  id: string;
  name: string;
  slug: string | null;
  brand_name: string | null;
  contact_email: string | null;
  status: string;
  monthly_fee_paise: number;
  portal_allowed_emails: string[] | null;
  bolna_agent_id: string | null;
  bolna_from_number: string | null;
  aisensy_api_key: string | null;
  aisensy_sender_id: string | null;
  brevo_sender_email: string | null;
  brevo_sender_name: string | null;
}

function fmtFee(paise: number): string {
  if (!paise) return '—';
  const rupees = paise / 100;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L/mo`;
  return `₹${rupees.toLocaleString('en-IN')}/mo`;
}

export default function ClientRow({ client }: { client: ClientLite }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(client.contact_email ?? '');
  const [allowed, setAllowed] = useState((client.portal_allowed_emails ?? []).join(', '));
  const [bolnaAgent, setBolnaAgent] = useState(client.bolna_agent_id ?? '');
  const [bolnaFrom, setBolnaFrom] = useState(client.bolna_from_number ?? '');
  const [aisensyKey, setAisensyKey] = useState(client.aisensy_api_key ?? '');
  const [aisensySender, setAisensySender] = useState(client.aisensy_sender_id ?? '');
  const [brevoEmail, setBrevoEmail] = useState(client.brevo_sender_email ?? '');
  const [brevoName, setBrevoName] = useState(client.brevo_sender_name ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const allowedList = allowed
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_email: email || null,
          portal_allowed_emails: allowedList,
          bolna_agent_id: bolnaAgent || null,
          bolna_from_number: bolnaFrom || null,
          aisensy_api_key: aisensyKey || null,
          aisensy_sender_id: aisensySender || null,
          brevo_sender_email: brevoEmail || null,
          brevo_sender_name: brevoName || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'failed' }));
        toast.error(err.error ?? 'Could not update client');
        return;
      }
      toast.success(`Updated ${client.brand_name ?? client.name}`);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEmail(client.contact_email ?? '');
    setAllowed((client.portal_allowed_emails ?? []).join(', '));
    setBolnaAgent(client.bolna_agent_id ?? '');
    setBolnaFrom(client.bolna_from_number ?? '');
    setAisensyKey(client.aisensy_api_key ?? '');
    setAisensySender(client.aisensy_sender_id ?? '');
    setBrevoEmail(client.brevo_sender_email ?? '');
    setBrevoName(client.brevo_sender_name ?? '');
    setEditing(false);
  }

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all';
  const inputStyle: React.CSSProperties = {
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  };

  const isActive = client.status === 'active';

  return (
    <tr
      className="align-top"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <td className="px-6 py-4">
        <p className="text-[14px] font-semibold text-white">{client.brand_name ?? client.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-gray-600">{client.slug ?? client.id}</p>
      </td>
      <td className="px-6 py-4">
        {editing ? (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
              className={inputClass}
              style={inputStyle}
            />
            <textarea
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              rows={2}
              placeholder="portal-allowed emails, comma separated"
              className={`${inputClass} resize-none font-mono text-[11px]`}
              style={inputStyle}
            />
            <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
              API Credentials (leave blank to use global env vars)
            </p>
            {([
              ['Bolna Agent ID', bolnaAgent, setBolnaAgent],
              ['Bolna From Number', bolnaFrom, setBolnaFrom],
              ['AiSensy API Key', aisensyKey, setAisensyKey],
              ['AiSensy Sender ID', aisensySender, setAisensySender],
              ['Brevo Sender Email', brevoEmail, setBrevoEmail],
              ['Brevo Sender Name', brevoName, setBrevoName],
            ] as [string, string, (v: string) => void][]).map(([label, val, set]) => (
              <input
                key={label}
                type="text"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={label}
                className={`${inputClass} font-mono text-[11px]`}
                style={inputStyle}
              />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-gray-300">{client.contact_email ?? '—'}</p>
            <p className="mt-1 text-[11px] text-gray-600">
              Portal access · {client.portal_allowed_emails?.length ?? 0} email
              {(client.portal_allowed_emails?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={
            isActive
              ? { backgroundColor: 'rgba(52,211,153,0.10)', color: '#34d399' }
              : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#6b7280' }
          }
        >
          {client.status}
        </span>
      </td>
      <td className="px-6 py-4 font-mono text-[13px]" style={{ color: '#D4AF37' }}>
        {fmtFee(client.monthly_fee_paise)}
      </td>
      <td className="px-6 py-4 text-right">
        {editing ? (
          <div className="inline-flex gap-1.5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#D4AF37', color: '#000' }}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] text-gray-400 transition-all hover:text-white disabled:opacity-50"
              style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] text-gray-400 transition-all hover:text-white"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}
