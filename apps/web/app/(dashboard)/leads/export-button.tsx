'use client';

import { Download } from 'lucide-react';
import { useToast } from '../../components/toast-provider';

export default function ExportButton() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.info('CSV export coming soon')}
      className="inline-flex items-center gap-1.5 rounded-md border border-dark-tertiary bg-dark-secondary px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </button>
  );
}
