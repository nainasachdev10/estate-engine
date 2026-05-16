'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Phone,
  Users,
  Briefcase,
  TrendingUp,
  Share2,
  Settings,
  Activity,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

interface ClientLite {
  id: string;
  name: string;
  brand_name: string | null;
  slug: string | null;
}

export default function Sidebar({ clients = [] }: { clients?: ClientLite[] }) {
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Pipeline', icon: Phone },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/projects', label: 'Projects', icon: Briefcase },
    { href: '/campaigns', label: 'Campaigns', icon: TrendingUp },
    { href: '/social', label: 'Social', icon: Share2 },
    { href: '/bulk-upload', label: 'Bulk Upload', icon: Users },
    { href: '/health', label: 'Health', icon: Activity },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-dark-tertiary bg-dark-secondary p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="font-serif text-2xl font-bold text-gold">Realty Engine</h1>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-dark-tertiary hover:text-gold transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Client switcher */}
      {clients.length > 0 && (
        <div className="mt-6 border-t border-dark-tertiary pt-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs uppercase tracking-wider text-gray-400 hover:bg-dark-tertiary"
          >
            <span>Switch Client</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
          {open && (
            <div className="mt-1 max-h-64 overflow-y-auto space-y-1">
              {clients.map((c) => {
                const slug = c.slug ?? c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/portal/${slug}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-gray-300 hover:bg-dark-tertiary hover:text-gold"
                  >
                    <span className="truncate">{c.brand_name ?? c.name}</span>
                    <ExternalLink className="h-3 w-3 flex-none opacity-60" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
