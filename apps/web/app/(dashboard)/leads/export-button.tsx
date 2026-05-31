'use client';

import { Download } from 'lucide-react';

interface Props {
  projectId?: string;
  status?: string;
}

export default function ExportButton({ projectId, status }: Props) {
  function buildHref() {
    const p = new URLSearchParams();
    if (projectId) p.set('project', projectId);
    if (status && status !== 'all') p.set('status', status);
    const qs = p.toString();
    return `/api/leads/export${qs ? `?${qs}` : ''}`;
  }

  return (
    <a
      href={buildHref()}
      download
      className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[13px] font-medium text-gray-400 transition-all hover:text-white"
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </a>
  );
}
