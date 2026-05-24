'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Phone,
  Users,
  Briefcase,
  BarChart2,
  TrendingUp,
  Share2,
  Settings,
  Activity,
  ChevronDown,
  ExternalLink,
  Upload,
} from 'lucide-react';

interface ClientLite {
  id: string;
  name: string;
  brand_name: string | null;
  slug: string | null;
}

interface SidebarProps {
  clients?: ClientLite[];
  newLeadCount?: number;
  currentClientSlug?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof Phone;
  hint?: string;
  badge?: number;
}

export default function Sidebar({
  clients = [],
  newLeadCount = 0,
  currentClientSlug = null,
}: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: '/pipeline', label: 'Pipeline', icon: Phone, hint: 'G P', badge: newLeadCount },
    { href: '/leads', label: 'Leads', icon: Users, hint: 'G L' },
    { href: '/projects', label: 'Projects', icon: Briefcase, hint: 'G R' },
    { href: '/analytics', label: 'Analytics', icon: BarChart2, hint: 'G A' },
    { href: '/campaigns', label: 'Campaigns', icon: TrendingUp, hint: 'G C' },
    { href: '/social', label: 'Social', icon: Share2, hint: 'G S' },
    { href: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
    { href: '/health', label: 'Health', icon: Activity },
    { href: '/settings', label: 'Settings', icon: Settings, hint: 'G ,' },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeClient =
    clients.find((c) => (c.slug ?? c.id) === currentClientSlug) ?? null;
  const activeLabel = activeClient
    ? activeClient.brand_name ?? activeClient.name
    : 'All Clients';

  return (
    <div className="flex w-64 flex-col border-r border-dark-tertiary bg-dark-secondary p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-gold/30 bg-gold/10 text-base font-bold text-gold shadow-[0_0_18px_rgba(212,175,55,0.25)]"
          >
            ⬡
          </span>
          <h1 className="font-serif text-2xl font-bold leading-none text-gold">
            Realty Engine
          </h1>
        </div>
        <p className="mt-2 pl-[42px] text-[10px] uppercase tracking-[0.2em] text-gray-500">
          Acquisition Console
        </p>
      </div>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors
                ${active
                  ? 'text-gold'
                  : 'text-gray-300 hover:bg-dark-tertiary hover:text-white'}`}
            >
              <span
                aria-hidden
                className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full transition-colors
                  ${active ? 'bg-gold' : 'bg-transparent'}`}
              />
              <Icon className={`h-4 w-4 ${active ? 'text-gold' : 'text-gray-400 group-hover:text-gray-200'}`} />
              <span className="flex-1">{item.label}</span>

              {item.href === '/pipeline' && item.badge && item.badge > 0 ? (
                <span
                  className="inline-flex h-1.5 w-1.5 flex-none rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                  aria-label={`${item.badge} new leads`}
                  title={`${item.badge} new lead${item.badge === 1 ? '' : 's'}`}
                />
              ) : null}

              {item.hint && (
                <span
                  className={`ml-1 hidden font-mono text-[10px] tracking-wider md:inline
                    ${active ? 'text-gold/60' : 'text-gray-600 group-hover:text-gray-500'}`}
                >
                  {item.hint}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Client switcher */}
      <div className="mt-6 border-t border-dark-tertiary pt-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md border border-dark-tertiary bg-dark-bg px-3 py-2 text-left text-xs transition-colors hover:border-gold/30"
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="block text-[9px] uppercase tracking-[0.2em] text-gray-500">
              Active Client
            </span>
            <span className="block truncate text-gold">{activeLabel}</span>
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 flex-none text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto rounded-md border border-dark-tertiary bg-dark-bg p-1">
            {clients.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">No clients yet.</p>
            ) : (
              clients.map((c) => {
                const slug = c.slug ?? c.id;
                const selected = slug === currentClientSlug;
                return (
                  <Link
                    key={c.id}
                    href={`/portal/${slug}`}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors
                      ${selected
                        ? 'bg-dark-tertiary text-gold'
                        : 'text-gray-300 hover:bg-dark-tertiary hover:text-white'}`}
                  >
                    <span className="truncate">{c.brand_name ?? c.name}</span>
                    <ExternalLink className="h-3 w-3 flex-none opacity-50" />
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
