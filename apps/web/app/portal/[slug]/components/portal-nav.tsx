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
    <nav
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        {/* Brand */}
        <Link
          href={`/portal/${slug}`}
          className="group flex items-center gap-3"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border font-serif text-sm font-bold transition-all"
            style={{
              backgroundColor: 'rgba(212,175,55,0.10)',
              borderColor: 'rgba(212,175,55,0.18)',
              color: '#D4AF37',
              fontFamily: 'Playfair Display, Georgia, serif',
            }}
          >
            {brandName.charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-col leading-none">
            <span
              className="font-serif text-xl font-bold tracking-tight"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#D4AF37' }}
            >
              {brandName}
            </span>
            <span
              className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-gray-600"
            >
              Client Portal
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname, slug);
            return (
              <Link
                key={item.label}
                href={item.href(slug)}
                className="relative px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] transition-colors"
                style={{ color: active ? '#D4AF37' : 'rgb(156,163,175)' }}
              >
                {item.label}
                <span
                  className="absolute inset-x-4 -bottom-[1px] h-px transition-all"
                  style={{ backgroundColor: active ? '#D4AF37' : 'transparent' }}
                />
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-[11px] text-gray-500 md:block">{userEmail}</span>
          )}
          {userEmail && (
            <form action={`/portal/${slug}/logout`} method="POST">
              <button
                type="submit"
                className="hidden rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 transition-colors md:inline-flex"
                style={{
                  borderColor: 'rgba(255,255,255,0.10)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                }}
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-gray-400 md:hidden"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
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
        <div
          className="border-t md:hidden"
          style={{ backgroundColor: '#050505', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname, slug);
              return (
                <Link
                  key={item.label}
                  href={item.href(slug)}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.18em] transition-colors"
                  style={{
                    backgroundColor: active ? 'rgba(212,175,55,0.10)' : 'transparent',
                    color: active ? '#D4AF37' : 'rgb(156,163,175)',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            {userEmail && (
              <div
                className="mt-3 flex items-center justify-between border-t pt-4"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <span className="text-[11px] text-gray-500">{userEmail}</span>
                <form action={`/portal/${slug}/logout`} method="POST">
                  <button
                    type="submit"
                    className="rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400"
                    style={{
                      borderColor: 'rgba(255,255,255,0.10)',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
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
