'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

const G = '#D4AF37';

function formatIST(d: Date): string {
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface TopbarProps { newLeadCount?: number }

export default function Topbar({ newLeadCount = 0 }: TopbarProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(formatIST(new Date()));
    const id = setInterval(() => setTime(formatIST(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b px-6 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {/* Live indicator */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.20em] text-gray-500">Live</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* IST clock */}
        <div className="hidden items-baseline gap-1.5 sm:flex">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-gray-700">IST</span>
          <span className="font-mono text-[13px] tabular-nums text-gray-400">{time || '--:--:--'}</span>
        </div>

        {/* Notifications */}
        <Link href="/pipeline" aria-label={`${newLeadCount} new leads`}
          className="relative rounded-xl border p-2 text-gray-500 transition-all hover:text-gold"
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Bell className="h-4 w-4" />
          {newLeadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-black leading-none text-black"
              style={{ backgroundColor: G, boxShadow: '0 0 10px rgba(212,175,55,0.55)' }}>
              {newLeadCount > 99 ? '99+' : newLeadCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-black text-black"
          style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #c9a137 100%)' }}>
          R
        </span>
      </div>
    </header>
  );
}
