/**
 * Presentation rules from the brief:
 *   • ₪ everywhere, consistently
 *   • negatives in red and in parentheses, e.g. (₪ 43,608)
 *   • zeros shown as an em dash
 */

const CURRENCY = '₪';

/** ₪ 1,234,567 — whole shekels, no decimals. Zero renders as an em dash. */
export function formatCurrency(value: number | null | undefined, options?: { showZero?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0 && !options?.showZero) return '—';
  const abs = Math.abs(rounded).toLocaleString('en-US');
  return rounded < 0 ? `(${CURRENCY}${abs})` : `${CURRENCY}${abs}`;
}

/** Compact form for chart axes and tight cards: ₪1.47M, ₪150k. */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${CURRENCY}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`;
  if (abs >= 1_000) return `${sign}${CURRENCY}${Math.round(abs / 1_000)}k`;
  return `${sign}${CURRENCY}${Math.round(abs)}`;
}

/** Exact amount with agorot — used in the reconciliation report only. */
export function formatCurrencyExact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(${CURRENCY}${abs})` : `${CURRENCY}${abs}`;
}

/** Plain integer, em dash for zero. */
export function formatNumber(value: number | null | undefined, options?: { showZero?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0 && !options?.showZero) return '—';
  return rounded.toLocaleString('en-US');
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Signed value for variance columns: +₪5,247 / (₪1,200). */
export function formatVariance(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  if (rounded === 0) return '—';
  if (rounded < 0) return `(${CURRENCY}${Math.abs(rounded).toLocaleString('en-US')})`;
  return `+${CURRENCY}${rounded.toLocaleString('en-US')}`;
}

/** Tailwind text colour for a signed number. */
export function signClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'text-muted';
  return value < 0 ? 'text-bad' : 'text-ink';
}

/** Green for good, red for bad — used on variances where up is good. */
export function varianceClass(value: number | null | undefined, higherIsBetter = true): string {
  if (!value) return 'text-muted';
  const good = higherIsBetter ? value > 0 : value < 0;
  return good ? 'text-good' : 'text-bad';
}

/**
 * Calendar labelling. The model is relative (timeline month 0 = funding month), but
 * owners think in real months, so an anchor date turns month numbers into "Sep 2026".
 */
export function monthLabel(anchorISO: string, timelineMonth: number): string {
  const [year, month] = anchorISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1 + timelineMonth, 1));
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "Operating month 12" / "Build month 2" / "Funding month". */
export function monthDescription(timelineMonth: number, operatingMonth: number): string {
  if (timelineMonth === 0) return 'Funding month';
  if (operatingMonth === 0) return `Build month ${timelineMonth}`;
  return `Operating month ${operatingMonth}`;
}

/** "Op 12" / "Build" — short form for tight table cells. */
export function shortMonthTag(timelineMonth: number, operatingMonth: number): string {
  if (timelineMonth === 0) return 'Funding';
  if (operatingMonth === 0) return 'Build';
  return `Op ${operatingMonth}`;
}
