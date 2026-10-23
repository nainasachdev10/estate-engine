'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
// SUPABASE DISABLED
// import { createBrowserClient } from '@supabase/ssr';
import { createDisabledSupabase } from '@realty-engine/core/db';
import {
  Phone, Users, Briefcase, BarChart2, TrendingUp, Share2,
  Settings, Activity, ChevronDown, ExternalLink, Upload,
  LogOut, Loader2, Inbox, Building2, ClipboardList, Handshake,
  Sun,
} from 'lucide-react';
import { LogoMark } from './logo';

const G = '#D4AF37';
const G10 = 'rgba(212,175,55,0.08)';
const HAIRLINE = '#26262A';

interface ClientLite { id: string; name: string; brand_name: string | null; slug: string | null }
interface SidebarProps {
  clients?: ClientLite[];
  newLeadCount?: number;
  pendingRequests?: number;
  openEscalations?: number;
  currentClientSlug?: string | null;
}
interface NavItem {
  href: string;
  label: string;
  icon: typeof Phone;
  hint?: string;
  badge?: number;
  badgeColor?: string; // defaults to gold; red = urgent
}
interface NavSection { title: string | null; items: NavItem[] }

export default function Sidebar({
  clients = [], newLeadCount = 0, pendingRequests = 0,
  openEscalations = 0, currentClientSlug = null,
}: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // SUPABASE DISABLED — restore the commented original below and drop the stub line.
  const supabase = useMemo(() => createDisabledSupabase(), []);
  // const supabase = useMemo(() =>
  //   createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  async function handleSignOut() {
    setLoggingOut(true);
    await supabase.auth.signOut().catch(() => null);
    window.location.href = '/login';
  }

  // Grouped by workflow, ordered by how often the operator reaches for each:
  // sell first, then market, then back office, then system plumbing.
  const sections: NavSection[] = [
    {
      title: null,
      items: [{ href: '/overview', label: 'Today', icon: Sun }],
    },
    {
      title: 'Sell',
      items: [
        { href: '/pipeline', label: 'Pipeline', icon: Phone, hint: 'G P', badge: newLeadCount },
        { href: '/leads', label: 'Leads', icon: Users, hint: 'G L' },
        { href: '/inventory', label: 'Inventory', icon: Building2 },
        { href: '/partners', label: 'Partners', icon: Handshake },
      ],
    },
    {
      title: 'Market',
      items: [
        { href: '/projects', label: 'Projects', icon: Briefcase, hint: 'G R' },
        { href: '/campaigns', label: 'Campaigns', icon: TrendingUp, hint: 'G C' },
        { href: '/social', label: 'Social', icon: Share2, hint: 'G S' },
        { href: '/analytics', label: 'Analytics', icon: BarChart2, hint: 'G A' },
      ],
    },
    {
      title: 'Back Office',
      items: [
        { href: '/operations', label: 'Operations', icon: ClipboardList, badge: openEscalations, badgeColor: '#f87171' },
        { href: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
      ],
    },
    {
      title: 'System',
      items: [
        { href: '/health', label: 'Health', icon: Activity },
        { href: '/requests', label: 'Requests', icon: Inbox, badge: pendingRequests },
        { href: '/settings', label: 'Settings', icon: Settings, hint: 'G ,' },
      ],
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeClient = clients.find((c) => (c.slug ?? c.id) === currentClientSlug) ?? null;
  const activeLabel = activeClient ? activeClient.brand_name ?? activeClient.name : 'All Clients';

  return (
    <div className="flex w-64 flex-none flex-col border-r" style={{ backgroundColor: '#0E0E10', borderColor: HAIRLINE }}>
      {/* Logo */}
      <div className="flex h-14 flex-none items-center gap-2.5 border-b px-5" style={{ borderColor: HAIRLINE }}>
        <LogoMark size={26} className="flex-none" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-none tracking-[-0.01em] text-white">
            Realty Engine<span style={{ color: G }}>_</span>
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">Acquisition Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {sections.map((section, si) => (
          <div key={section.title ?? si}>
            {section.title && (
              <p className="mb-1.5 flex items-center gap-2 px-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-gray-600">
                <span className="text-gray-700">{String(si).padStart(2, '0')}</span>
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badgeColor = item.badgeColor ?? G;
                return (
                  <Link key={item.href} href={item.href}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors duration-150 ${
                      active
                        ? 'text-white'
                        : 'text-gray-500 hover:bg-[#18181B] hover:text-gray-200'
                    }`}
                    style={active ? { backgroundColor: '#1B1B1E' } : undefined}>
                    {active && <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2" style={{ backgroundColor: G }} />}
                    <Icon className="h-4 w-4 flex-none" style={{ color: active ? G : undefined }} />
                    <span className="flex-1">{item.label}</span>

                    {item.badge && item.badge > 0 ? (
                      <span className="rounded-sm border px-1.5 py-px font-mono text-[9.5px] font-medium"
                        style={{ borderColor: `${badgeColor}66`, backgroundColor: `${badgeColor}12`, color: badgeColor }}
                        aria-label={`${item.badge} pending`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                    {item.hint && (
                      <span className="hidden font-mono text-[9px] tracking-wider md:inline" style={{ color: active ? 'rgba(212,175,55,0.7)' : '#3F3F46' }}>{item.hint}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Client switcher */}
      <div className="border-t px-3 pt-4" style={{ borderColor: HAIRLINE }}>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors hover:border-[#3A3A40]"
          style={{ backgroundColor: '#131315', borderColor: HAIRLINE }}>
          <span className="min-w-0 flex-1 truncate">
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-gray-600">Active Client</span>
            <span className="block truncate text-[13px] font-medium" style={{ color: G }}>{activeLabel}</span>
          </span>
          <ChevronDown className={`ml-2 h-3.5 w-3.5 flex-none text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-1"
            style={{ backgroundColor: '#0B0B0C', borderColor: HAIRLINE }}>
            {clients.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-gray-600">No clients yet.</p>
            ) : (
              clients.map((c) => {
                const slug = c.slug ?? c.id;
                const selected = slug === currentClientSlug;
                return (
                  <Link key={c.id} href={`/portal/${slug}`}
                    className="flex items-center justify-between rounded-sm px-2.5 py-2 text-[12px] transition-colors hover:bg-[#18181B]"
                    style={{ backgroundColor: selected ? G10 : 'transparent', color: selected ? G : '#9CA3AF' }}>
                    <span className="truncate">{c.brand_name ?? c.name}</span>
                    <ExternalLink className="h-3 w-3 flex-none opacity-40" />
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button type="button" onClick={handleSignOut} disabled={loggingOut}
        className="mx-3 mb-4 mt-2 flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: HAIRLINE, backgroundColor: 'transparent' }}>
        {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
