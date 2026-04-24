/**
 * Display formatters.
 *
 * European number formatting: thin non-breaking space as thousands separator.
 * We deliberately use fr-FR (not en-US) because all user-facing copy is French.
 */

const numberFormatter = new Intl.NumberFormat("fr-FR");

/**
 * Format an integer-like number for display.
 * Returns "—" when the value is missing, null, undefined, NaN, or non-finite.
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return numberFormatter.format(Math.round(value));
};

/**
 * Compact formatter for high-volume counts ("12,3 k", "1,4 M").
 * Keeps a single decimal for thousands/millions, no decimal for small values.
 */
export const formatCompact = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  const n = Math.round(value);
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k.toFixed(k < 10 ? 1 : 0).replace(".", ",")} k`;
  }
  const m = n / 1_000_000;
  return `${m.toFixed(m < 10 ? 1 : 0).replace(".", ",")} M`;
};
