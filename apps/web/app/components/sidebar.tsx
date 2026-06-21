'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Phone, Users, Briefcase, BarChart2, TrendingUp, Share2,
  Settings, Activity, ChevronDown, ExternalLink, Upload,
  LogOut, Loader2, Inbox,
} from 'lucide-react';
import { LogoMark } from './logo';

const G = '#D4AF37';
const G10 = 'rgba(212,175,55,0.10)';
const G20 = 'rgba(212,175,55,0.20)';

interface ClientLite { id: string; name: string; brand_name: string | null; slug: string | null }
interface SidebarProps { clients?: ClientLite[]; newLeadCount?: number; pendingRequests?: number; currentClientSlug?: string | null }
interface NavItem { href: string; label: string; icon: typeof Phone; hint?: string; badge?: number }

export default function Sidebar({ clients = [], newLeadCount = 0, pendingRequests = 0, currentClientSlug = null }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const supabase = useMemo(() =>
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  async function handleSignOut() {
    setLoggingOut(true);
    await supabase.auth.signOut().catch(() => null);
    window.location.href = '/login';
  }

  const navItems: NavItem[] = [
    { href: '/pipeline', label: 'Pipeline', icon: Phone, hint: 'G P', badge: newLeadCount },
    { href: '/leads', label: 'Leads', icon: Users, hint: 'G L' },
    { href: '/projects', label: 'Projects', icon: Briefcase, hint: 'G R' },
    { href: '/analytics', label: 'Analytics', icon: BarChart2, hint: 'G A' },
    { href: '/campaigns', label: 'Campaigns', icon: TrendingUp, hint: 'G C' },
    { href: '/social', label: 'Social', icon: Share2, hint: 'G S' },
    { href: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
    { href: '/health', label: 'Health', icon: Activity },
    { href: '/requests', label: 'Requests', icon: Inbox, badge: pendingRequests },
    { href: '/settings', label: 'Settings', icon: Settings, hint: 'G ,' },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeClient = clients.find((c) => (c.slug ?? c.id) === currentClientSlug) ?? null;
  const activeLabel = activeClient ? activeClient.brand_name ?? activeClient.name : 'All Clients';

  return (
    <div className="flex w-64 flex-none flex-col border-r p-5" style={{ backgroundColor: '#070707', borderColor: 'rgba(255,255,255,0.07)' }}>
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} className="flex-none" />
          <h1 className="font-serif text-lg font-bold leading-none" style={{ color: G }}>Realty Engine</h1>
        </div>
        <p className="mt-1.5 pl-[42px] text-[9px] font-medium uppercase tracking-[0.25em] text-gray-600">
          Acquisition Console
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'text-gold'
                  : 'text-gray-500 hover:bg-[rgba(255,255,255,0.04)] hover:text-white'
              }`}
              style={active ? { backgroundColor: G10 } : undefined}>
              <Icon className="h-4 w-4 flex-none" style={{ color: active ? G : undefined }} />
              <span className="flex-1">{item.label}</span>

              {item.href === '/pipeline' && item.badge && item.badge > 0 ? (
                <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: G, boxShadow: '0 0 8px rgba(212,175,55,0.7)' }} aria-label={`${item.badge} new leads`} />
              ) : null}
              {item.href === '/requests' && item.badge && item.badge > 0 ? (
                <span className="rounded-full px-1.5 py-px font-mono text-[9px] font-bold" style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: G }}>{item.badge}</span>
              ) : null}
              {item.hint && (
                <span className="hidden font-mono text-[9px] tracking-wider md:inline" style={{ color: active ? 'rgba(212,175,55,0.5)' : '#374151' }}>{item.hint}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Client switcher */}
      <div className="mt-6 border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <span className="min-w-0 flex-1 truncate">
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-gray-600">Active Client</span>
            <span className="block truncate text-[13px] font-medium" style={{ color: G }}>{activeLabel}</span>
          </span>
          <ChevronDown className={`ml-2 h-3.5 w-3.5 flex-none text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-xl border p-1.5"
            style={{ backgroundColor: '#060606', borderColor: 'rgba(255,255,255,0.07)' }}>
            {clients.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-gray-600">No clients yet.</p>
            ) : (
              clients.map((c) => {
                const slug = c.slug ?? c.id;
                const selected = slug === currentClientSlug;
                return (
                  <Link key={c.id} href={`/portal/${slug}`}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-all"
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-medium text-gray-600 transition-all hover:border-red-500/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
