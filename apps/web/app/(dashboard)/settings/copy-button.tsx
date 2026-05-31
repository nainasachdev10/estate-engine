'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from '../../components/toast-provider';

export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label ?? 'Value'} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex flex-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-mono text-gray-500 transition-all hover:text-white"
      style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' }}
    >
      {copied ? <Check className="h-3 w-3" style={{ color: '#34d399' }} /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
