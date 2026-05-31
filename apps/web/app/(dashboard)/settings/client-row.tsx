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

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-white">{client.brand_name ?? client.name}</p>
        <p className="font-mono text-[11px] text-gray-500">{client.slug ?? client.id}</p>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full rounded-md border border-dark-tertiary bg-dark-bg px-2 py-1 text-xs text-white focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
            <textarea
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              rows={2}
              placeholder="portal-allowed emails, comma separated"
              className="w-full resize-none rounded-md border border-dark-tertiary bg-dark-bg px-2 py-1 text-[11px] text-gray-300 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
            <p className="pt-1 text-[10px] uppercase tracking-wider text-gray-500">API Credentials (leave blank to use global env vars)</p>
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
                className="w-full rounded-md border border-dark-tertiary bg-dark-bg px-2 py-1 text-[11px] text-gray-300 placeholder-gray-600 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-200">{client.contact_email ?? '—'}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Portal access: {client.portal_allowed_emails?.length ?? 0} email
              {(client.portal_allowed_emails?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] capitalize ${
            client.status === 'active'
              ? 'bg-green-900/60 text-green-300'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {client.status}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-gold">{fmtFee(client.monthly_fee_paise)}</td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="inline-flex gap-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded border border-gold/30 bg-gold/10 px-2 py-1 text-xs text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded border border-dark-tertiary bg-dark-bg px-2 py-1 text-xs text-gray-300 transition-colors hover:text-white disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded border border-dark-tertiary bg-dark-bg px-2 py-1 text-xs text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}
