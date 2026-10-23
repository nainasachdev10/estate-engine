'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const G = '#D4AF37';

function formatIST(d: Date): string {
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface TopbarProps { newLeadCount?: number; escalationCount?: number; demoRateCount?: number }

export default function Topbar({ newLeadCount = 0, escalationCount = 0, demoRateCount = 0 }: TopbarProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(formatIST(new Date()));
    const id = setInterval(() => setTime(formatIST(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b px-6 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(11,11,12,0.85)', borderColor: '#26262A' }}>
      {/* Live indicator */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ borderColor: 'rgba(52,211,153,0.45)', color: '#34d399', backgroundColor: 'rgba(52,211,153,0.06)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600 md:inline">Engine · nominal</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* IST clock */}
        <div className="hidden items-baseline gap-1.5 sm:flex">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-gray-600">IST</span>
          <span className="font-mono text-[12.5px] tabular-nums text-gray-300">{time || '--:--:--'}</span>
        </div>

        {/* Demo-rate reminder — cost sheets carry a * until the official card lands */}
        {demoRateCount > 0 && (
          <Link href="/inventory" aria-label="Demo rates in use"
            className="hidden items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] md:flex"
            style={{ borderColor: 'rgba(234,179,8,0.45)', backgroundColor: 'rgba(234,179,8,0.06)', color: '#eab308' }}>
            <span aria-hidden>*</span>
            Demo rate{demoRateCount > 1 ? 's' : ''} active
          </Link>
        )}

        {/* Human-handover alert — red, because ignoring it costs revenue */}
        {escalationCount > 0 && (
          <Link href="/operations" aria-label={`${escalationCount} open handovers`}
            className="relative flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:bg-[rgba(239,68,68,0.12)]"
            style={{ borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{escalationCount} handover{escalationCount > 1 ? 's' : ''}</span>
          </Link>
        )}

        {/* Notifications */}
        <Link href="/pipeline" aria-label={`${newLeadCount} new leads`}
          className="relative rounded-md border p-2 text-gray-400 transition-colors hover:border-[rgba(212,175,55,0.5)] hover:text-gold"
          style={{ borderColor: '#26262A', backgroundColor: '#131315' }}>
          <Bell className="h-4 w-4" />
          {newLeadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-sm px-1 font-mono text-[9px] font-bold leading-none text-black"
              style={{ backgroundColor: G }}>
              {newLeadCount > 99 ? '99+' : newLeadCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <span className="flex h-8 w-8 items-center justify-center rounded-md font-display text-[14px] font-bold text-black"
          style={{ backgroundColor: G }}>
          R
        </span>
      </div>
    </header>
  );
}
