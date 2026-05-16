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
      className="inline-flex flex-none items-center gap-1 rounded border border-dark-tertiary bg-dark-bg px-2 py-1 text-xs text-gray-300 transition-colors hover:border-gold/30 hover:text-gold"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
