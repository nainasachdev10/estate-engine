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
  const [allowed, setAllowed] = useState(
    (client.portal_allowed_emails ?? []).join(', '),
  );
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
