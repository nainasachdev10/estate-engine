import { CSSProperties } from 'react';

/**
 * Realty Engine brand mark — a gold hexagon enclosing three rising bars
 * (the "acquisition engine" / growth motif). Replaces the placeholder ⬡ emoji.
 */
export function LogoMark({
  size = 32,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = 'rg-gold';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0D879" />
          <stop offset="0.55" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#A9842A" />
        </linearGradient>
      </defs>
      {/* hexagon */}
      <path
        d="M16 2.6 27.6 9.3V22.7L16 29.4 4.4 22.7V9.3L16 2.6Z"
        fill="rgba(212,175,55,0.08)"
        stroke={`url(#${id})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* rising bars */}
      <g fill={`url(#${id})`}>
        <rect x="10.4" y="17.5" width="2.7" height="5.6" rx="1.1" />
        <rect x="14.65" y="13.8" width="2.7" height="9.3" rx="1.1" />
        <rect x="18.9" y="10.2" width="2.7" height="12.9" rx="1.1" />
      </g>
    </svg>
  );
}

/**
 * Mark + wordmark lockup. Use `subtitle` for the eyebrow line under the name.
 */
export function Logo({
  size = 32,
  href,
  subtitle,
  nameClassName = 'font-serif text-lg font-bold leading-none',
}: {
  size?: number;
  href?: string;
  subtitle?: string;
  nameClassName?: string;
}) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex flex-col">
        <span className={nameClassName} style={{ color: '#D4AF37' }}>
          Realty Engine
        </span>
        {subtitle && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.25em] text-gray-600">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
  return inner;
}
