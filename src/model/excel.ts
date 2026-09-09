/**
 * Small helpers that reproduce Excel / Google Sheets semantics exactly.
 * Getting these wrong is the usual source of "close but not equal" model drift.
 */

/**
 * Excel ROUND: half away from zero.
 * JavaScript's Math.round is half UP, which differs for negatives (-2.5 → -2 vs -3).
 */
export function excelRound(value: number, digits = 0): number {
  const factor = Math.pow(10, digits);
  const scaled = value * factor;
  const rounded = (scaled < 0 ? -1 : 1) * Math.round(Math.abs(scaled));
  return rounded / factor;
}

/** Excel ROUNDUP toward +infinity for positive inputs; used as ROUNDUP(x, 0). */
export function excelRoundUp(value: number, digits = 0): number {
  const factor = Math.pow(10, digits);
  const scaled = value * factor;
  const rounded = (scaled < 0 ? -1 : 1) * Math.ceil(Math.abs(scaled));
  return rounded / factor;
}

/**
 * Standard annuity payment, matching the spreadsheet's explicit formula
 * `principal * (rate/12) / (1 - (1 + rate/12)^(-months))` (Financing!C10).
 * Falls back to straight-line when the rate is zero (Financing!B10).
 */
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  if (annualRate === 0) return principal / months;
  const i = annualRate / 12;
  return (principal * i) / (1 - Math.pow(1 + i, -months));
}

/** Guard against -0 and floating-point dust leaking into displayed values. */
export function clean(value: number, epsilon = 1e-9): number {
  return Math.abs(value) < epsilon ? 0 : value;
}
