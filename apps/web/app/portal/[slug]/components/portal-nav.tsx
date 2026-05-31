'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type NavItem = { label: string; href: (slug: string) => string; match: (path: string, slug: string) => boolean };

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: (slug) => `/portal/${slug}`,
    match: (path, slug) => path === `/portal/${slug}`,
  },
  {
    label: 'Leads',
    href: (slug) => `/portal/${slug}/leads`,
    match: (path, slug) => path.startsWith(`/portal/${slug}/leads`),
  },
  {
    label: 'Projects',
    href: (slug) => `/portal/${slug}/projects`,
    match: (path, slug) => path.startsWith(`/portal/${slug}/projects`),
  },
];

export default function PortalNav({
  slug,
  brandName,
  userEmail,
}: {
  slug: string;
  brandName: string;
  userEmail: string | null;
}) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link
          href={`/portal/${slug}`}
          className="group flex items-center gap-2.5"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 font-serif text-sm text-[#d4af37] transition-all group-hover:bg-[#d4af37]/20">
            {brandName.charAt(0).toUpperCase()}
          </span>
          <span
            className="font-serif text-xl font-bold text-[#d4af37]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {brandName}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname, slug);
            return (
              <Link
                key={item.label}
                href={item.href(slug)}
                className={`relative px-3 py-2 text-sm transition-colors ${
                  active ? 'text-[#d4af37]' : 'text-white/60 hover:text-white'
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-3 -bottom-[1px] h-px transition-all ${
                    active ? 'bg-[#d4af37]' : 'bg-transparent'
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-[11px] text-white/40 md:block">{userEmail}</span>
          )}
          {userEmail && (
            <form action={`/portal/${slug}/logout`} method="POST">
              <button
                type="submit"
                className="hidden rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] md:inline-flex"
              >
                Sign out
              </button>
            </form>
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] md:hidden"
          >
            <span aria-hidden className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0a0a0a] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname, slug);
              return (
                <Link
                  key={item.label}
                  href={item.href(slug)}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-[#d4af37]/10 text-[#d4af37]'
                      : 'text-white/70 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {userEmail && (
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[11px] text-white/40">{userEmail}</span>
                <form action={`/portal/${slug}/logout`} method="POST">
                  <button
                    type="submit"
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
