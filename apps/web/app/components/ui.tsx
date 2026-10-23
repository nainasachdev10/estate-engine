/**
 * ui.tsx — the admin console's shared design language. Every screen composes
 * these instead of hand-rolling cards/headers/stats, so the whole product
 * reads as one system: an instrument panel. Ink canvas, graphite panels,
 * 1px filament hairlines, tight 4px corners, mono labels — and gold
 * (#D4AF37) as the single accent, reserved for money/attention. Red is
 * reserved for "a human must act".
 *
 * Server-safe (no hooks) — usable from both server and client components.
 */

import Link from 'next/link';

export const GOLD = '#D4AF37';
export const INK = '#0B0B0C';
export const CARD_BG = '#131315';
export const CARD_BG_ACCENT = '#151513';
export const SLATE = '#1B1B1E';
export const BORDER = '#26262A';
export const BORDER_ACCENT = 'rgba(212,175,55,0.30)';
export const RED = '#f87171';

// Flat panels: hairlines carry the structure, not shadows.
export const ELEVATION = 'none';

// ── Form + button primitives: import these, never restyle locally ────────────
export const INPUT_CLS =
  'w-full rounded-md border border-[#26262A] bg-[#1B1B1E] px-3.5 py-2 text-[13px] text-white placeholder:text-gray-600 transition-colors duration-150 hover:border-[#34343A] focus:border-[#D4AF37] focus:outline-none disabled:opacity-50';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50';
export const BTN_VARIANTS = {
  primary: `${BTN_BASE} bg-[#D4AF37] text-black hover:bg-[#E6C55A] active:translate-y-px`,
  ghost: `${BTN_BASE} border border-[#26262A] bg-[#131315] text-gray-200 hover:text-white hover:border-[#3A3A40]`,
  danger: `${BTN_BASE} border border-[rgba(239,68,68,0.35)] bg-transparent text-red-400 hover:bg-[rgba(239,68,68,0.08)]`,
} as const;

export function Button({ variant = 'primary', busy = false, children, className = '', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN_VARIANTS; busy?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || busy} className={`${BTN_VARIANTS[variant]} ${className}`}>
      {busy && <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/** Outlined status chip — mono caps, like a panel indicator (LIVE / RUNNING). */
export function Badge({ color = GOLD, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
      style={{ borderColor: `${color}66`, backgroundColor: `${color}12`, color }}>
      {children}
    </span>
  );
}

/** Mono section label: `// TEXT` — the spec-book voice for small headings. */
export function SpecLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-gray-500 ${className}`}>
      <span style={{ color: GOLD }}>{'//'}</span> {children}
    </p>
  );
}

/** Eyebrow / title / subtitle — the one page-header pattern, everywhere. */
export function PageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6" style={{ borderColor: BORDER }}>
      <div>
        <SpecLabel>{eyebrow}</SpecLabel>
        <h1 className="mt-3 font-display text-[28px] font-bold uppercase leading-none tracking-[-0.01em] text-white md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * The single stat tile. `accent` = gold number + gold corner tick (use for the
 * numbers that make money); `urgent` = red (use only when a human must act);
 * `href` makes the whole tile a link with an "Open →" affordance.
 */
export function StatCard({ label, value, sub, href, accent = false, urgent = false }: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accent?: boolean;
  urgent?: boolean;
}) {
  const tone = urgent ? RED : accent ? GOLD : null;
  const body = (
    <>
      {tone && <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-[2px]" style={{ backgroundColor: tone }} />}
      <p className="text-[12px] font-medium text-gray-500">{label}</p>
      <p className="mt-3 truncate font-display text-[30px] font-medium leading-none tracking-[-0.02em]"
        style={{ color: tone ?? '#F2F2F3' }}>{value}</p>
      {sub && <p className="mt-2.5 font-mono text-[11px] text-gray-500">{sub}</p>}
      {href && (
        <span className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-700 transition-colors group-hover:text-[#D4AF37]">
          Open →
        </span>
      )}
    </>
  );
  const style = {
    backgroundColor: urgent ? 'rgba(239,68,68,0.05)' : accent ? CARD_BG_ACCENT : CARD_BG,
    borderColor: urgent ? 'rgba(239,68,68,0.35)' : accent ? BORDER_ACCENT : BORDER,
  };
  if (href) {
    return (
      <Link href={href} className="group relative overflow-hidden rounded-md border p-5 transition-colors duration-150 hover:border-[rgba(212,175,55,0.45)]" style={style}>
        {body}
      </Link>
    );
  }
  return <div className="relative overflow-hidden rounded-md border p-5" style={style}>{body}</div>;
}

/** Standard panel: titled header bar over a hairline, then the body. `accent` for panels that demand attention. */
export function Card({ title, hint, viewAllHref, viewAllLabel, accent = false, className = '', children }: {
  title?: string;
  hint?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const border = accent ? BORDER_ACCENT : BORDER;
  return (
    <div className={`relative overflow-hidden rounded-md border ${className}`}
      style={{ backgroundColor: accent ? CARD_BG_ACCENT : CARD_BG, borderColor: border }}>
      {accent && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundColor: GOLD }} />}
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: border }}>
          <div className="min-w-0">
            {title && <h2 className="font-sans text-[14px] font-semibold tracking-normal text-white">{title}</h2>}
            {hint && <p className="mt-0.5 text-[12px] text-gray-500">{hint}</p>}
          </div>
          {viewAllHref && (
            <Link href={viewAllHref}
              className="flex-none rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-[rgba(212,175,55,0.6)]"
              style={{ color: GOLD, borderColor: 'rgba(212,175,55,0.3)' }}>
              {viewAllLabel ?? 'View all'} →
            </Link>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Empty state with a consistent voice: what's missing + how it gets filled. */
export function EmptyState({ title, body, ctaHref, ctaLabel }: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="hairline-grid rounded-md border border-dashed p-10 text-center"
      style={{ borderColor: '#2E2E33', backgroundColor: 'rgba(19,19,21,0.6)' }}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gray-600">Empty · awaiting data</p>
      <p className="mt-3 font-display text-[18px] font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-gray-500">{body}</p>
      {ctaHref && (
        <Link href={ctaHref}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-black transition-colors hover:bg-[#E6C55A]">
          {ctaLabel ?? 'Get started'} →
        </Link>
      )}
    </div>
  );
}
