/**
 * shared.ts — single home for helpers that had drifted into 3–5 copies across
 * the codebase (quiet hours, price formatting, slugs). Import from here; do
 * not re-declare locally.
 */

/** True between 21:00 and 09:00 IST — no calls or messages in this window. */
export function isQuietHoursIST(now = new Date()): boolean {
  const istHour = ((now.getUTCHours() * 60 + now.getUTCMinutes() + 330) / 60) % 24;
  return istHour >= 21 || istHour < 9;
}

/**
 * Formats a project price band for prose ("₹1.2 Cr to ₹2.5 Cr").
 * NOTE: despite the column names (price_*_paise), project price columns store
 * RUPEES — see CLAUDE.md "Money units" for the full story.
 */
export function formatPriceRange(min: number | null, max: number | null): string {
  const fmt = (v: number) =>
    v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(1)} Cr` : `₹${(v / 100_000).toFixed(0)} Lac`;
  if (min && max) return `${fmt(min)} to ${fmt(max)}`;
  if (min) return `starting ${fmt(min)}`;
  if (max) return `up to ${fmt(max)}`;
  return 'price on request';
}

/** URL-safe slug: lowercase alphanumerics joined by single hyphens. */
export function makeSlug(text: string, maxLen = 60): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
}
