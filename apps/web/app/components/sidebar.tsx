'use client';

import Link from 'next/link';
import {
  Phone,
  Users,
  Briefcase,
  TrendingUp,
  Share2,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { href: '/pipeline', label: 'Pipeline', icon: Phone },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/projects', label: 'Projects', icon: Briefcase },
    { href: '/campaigns', label: 'Campaigns', icon: TrendingUp },
    { href: '/social', label: 'Social', icon: Share2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-dark-tertiary bg-dark-secondary p-6">
      <div className="mb-12">
        <h1 className="font-serif text-2xl font-bold text-gold">
          Realty Engine
        </h1>
      </div>

      <nav className="space-y-2">
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
    </div>
  );
}
