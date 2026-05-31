'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

function formatIST(d: Date): string {
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface TopbarProps {
  newLeadCount?: number;
}

export default function Topbar({ newLeadCount = 0 }: TopbarProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(formatIST(new Date()));
    const id = setInterval(() => setTime(formatIST(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b border-dark-tertiary bg-dark-bg/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Live
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-baseline gap-2 sm:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            IST
          </span>
          <span className="font-mono text-sm tabular-nums text-gray-200">
            {time || '--:--:--'}
          </span>
        </div>

        <Link
          href="/pipeline"
          aria-label={`${newLeadCount} new leads`}
          className="relative rounded-md border border-dark-tertiary bg-dark-secondary p-2 text-gray-400 transition-colors hover:border-gold/30 hover:text-gold"
        >
          <Bell className="h-4 w-4" />
          {newLeadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 font-mono text-[9px] font-bold leading-none text-black shadow-[0_0_8px_rgba(212,175,55,0.6)]">
              {newLeadCount > 99 ? '99+' : newLeadCount}
            </span>
          )}
        </Link>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-dark-bg">
          R
        </span>
      </div>
    </header>
  );
}
