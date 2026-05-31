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
      className="inline-flex items-center gap-1.5 rounded-md border border-dark-tertiary bg-dark-secondary px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </a>
  );
}
