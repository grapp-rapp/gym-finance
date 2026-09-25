import { excelRoundUp } from './excel';
import type { Assumptions, OperatingCostLine, StartupCostLine } from './types';

/** Operating cost totals. Reference: "Operating Costs" sheet, rows 23-26. */
export interface OperatingCostTotals {
  /** Total gross cash per month across every line (₪69,849 in the base case). */
  monthlyGross: number;
  /** Total ex-VAT cost per month (₪63,913.73 in the base case). */
  monthlyExVat: number;
  /** Reclaimable VAT contained in the gross figure. */
  monthlyVat: number;
  annualGross: number;
  annualExVat: number;
  /** Per-line breakdown with the derived VAT and ex-VAT amounts. */
  lines: Array<OperatingCostLine & { vat: number; exVat: number }>;
}

export function operatingCostTotals(a: Assumptions): OperatingCostTotals {
  const lines = a.operatingCosts.map((line) => {
    const vat = line.vatable ? line.monthlyGross - line.monthlyGross / (1 + a.vatRate) : 0;
    return { ...line, vat, exVat: line.monthlyGross - vat };
  });
  const monthlyGross = lines.reduce((s, l) => s + l.monthlyGross, 0);
  const monthlyExVat = lines.reduce((s, l) => s + l.exVat, 0);
  return {
    monthlyGross,
    monthlyExVat,
    monthlyVat: monthlyGross - monthlyExVat,
    annualGross: monthlyGross * 12,
    annualExVat: monthlyExVat * 12,
    lines,
  };
}

/**
 * Core operating cost for one operating month, ex VAT.
 * Reference: "Monthly Base" column N — closure months use the closure economic cost,
 * operating months use the operating-cost table with annual inflation applied.
 */
export function coreOpexAt(a: Assumptions, operatingMonth: number, monthlyExVat: number): number {
  if (operatingMonth === 0) return a.closureCostExVat;
  const yearIndex = Math.max(0, excelRoundUp(operatingMonth / 12, 0) - 1);
  return monthlyExVat * Math.pow(1 + a.opexInflation, yearIndex);
}

/** Startup / build totals. Reference: "Startup & Funding" sheet, rows 15-22. */
export interface StartupTotals {
  /** Total startup budget ex VAT excluding cash reserves. */
  totalExVat: number;
  /** Reclaimable startup VAT — the refund that lands later (₪151,933.73). */
  reclaimableVat: number;
  /** Gross cash allocated for actual startup expenses. */
  grossCash: number;
  /** Owner equity + Loan A + Loan B. */
  totalFinancing: number;
  /** Cash left on day one after paying the gross build bill (₪68,990.00). */
  cashHeadroom: number;
  /** Economic cost of the closure period, ex VAT (₪60,054). */
  closureCost: number;
  /** Cash after closure + refund (₪160,869.73). */
  cashAfterClosureAndRefund: number;
  lines: Array<StartupCostLine & { vat: number; gross: number }>;
}

export function startupTotals(a: Assumptions): StartupTotals {
  const lines = a.startupCosts.filter((line) => line.id !== 'run-in').map((line) => {
    const vat = line.vatable ? line.exVat * a.vatRate : 0;
    return { ...line, vat, gross: line.exVat + vat };
  });
  const totalExVat = lines.reduce((s, l) => s + l.exVat, 0);
  const reclaimableVat = lines.reduce((s, l) => s + l.vat, 0);
  const grossCash = lines.reduce((s, l) => s + l.gross, 0);
  const totalFinancing = a.selfFinancing + a.loanAPrincipal + a.loanBPrincipal;
  const cashHeadroom = totalFinancing - grossCash;
  const closureCost = a.closureMonths * a.closureCostExVat;
  return {
    totalExVat,
    reclaimableVat,
    grossCash,
    totalFinancing,
    cashHeadroom,
    closureCost,
    cashAfterClosureAndRefund: cashHeadroom - closureCost + reclaimableVat,
    lines,
  };
}
