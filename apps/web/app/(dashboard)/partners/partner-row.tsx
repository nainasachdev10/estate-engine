'use client';

import { useState } from 'react';

interface Partner {
  id: string; name: string; firm_name: string | null; cp_code: string; status: 'active' | 'inactive';
}
interface Stats { leads: number; visits: number; bookings: number; value: number }

export default function PartnerRow({ rank, partner, stats, landingSlug }: {
  rank: number; partner: Partner; stats: Stats; landingSlug: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const link = landingSlug ? `${base}/p/${landingSlug}?cp=${partner.cp_code}` : partner.cp_code;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', opacity: partner.status === 'inactive' ? 0.45 : 1 }}>
      <td className="py-2.5 pr-3 font-mono font-black" style={{ color: rank <= 3 ? '#D4AF37' : '#6B7280' }}>{rank}</td>
      <td className="py-2.5 pr-3">
        <p className="font-medium text-white">{partner.name}</p>
        {partner.firm_name && <p className="text-[11px] text-gray-500">{partner.firm_name}</p>}
      </td>
      <td className="py-2.5 pr-3">
        <button onClick={copyLink}
          className="rounded-lg border px-2.5 py-1 font-mono text-[11px] text-gray-300 transition hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          title="Copy the partner's share link — leads through it are attributed to them permanently">
          {copied ? 'Copied ✓' : partner.cp_code}
        </button>
      </td>
      <td className="py-2.5 pr-3 text-right font-mono text-gray-300">{stats.leads}</td>
      <td className="py-2.5 pr-3 text-right font-mono text-gray-300">{stats.visits}</td>
      <td className="py-2.5 pr-3 text-right font-mono font-bold" style={{ color: stats.bookings > 0 ? '#D4AF37' : '#6B7280' }}>{stats.bookings}</td>
      <td className="py-2.5 text-right font-mono text-gray-300">{stats.value > 0 ? `₹${(stats.value / 1e7).toFixed(1)} Cr` : '—'}</td>
    </tr>
  );
}
