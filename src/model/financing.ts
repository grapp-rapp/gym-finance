import { annuityPayment } from './excel';
import type { Assumptions } from './types';

/** Loan terms derived from the assumptions. Reference: "Financing" sheet, rows 5-13. */
export interface LoanTerms {
  /** Prime = BOI policy rate + spread (Inputs B13). */
  primeRate: number;
  loanAPrincipal: number;
  loanARate: number;
  /** Loan A monthly payment after grace: principal / term (Financing B10). */
  loanAPayment: number;
  loanBPrincipal: number;
  loanBRate: number;
  /** Loan B monthly annuity payment after grace (Financing C10). */
  loanBPayment: number;
  /** Combined contractual debt service after grace (Financing D10). */
  totalPayment: number;
  /**
   * Grace is genuinely free — no interest accrues and no payment is due.
   * Payments begin at this TIMELINE month (Financing D12), not an operating month.
   */
  paymentStartTimelineMonth: number;
  /** The operating month that corresponds to `paymentStartTimelineMonth` (Financing D13). */
  paymentStartOperatingMonth: number;
}

export function loanTerms(a: Assumptions): LoanTerms {
  const primeRate = a.boiRate + a.primeSpread;
  const loanAPayment = annuityPayment(a.loanAPrincipal, a.loanARate, a.repaymentMonths);
  const loanBPayment = annuityPayment(a.loanBPrincipal, primeRate, a.repaymentMonths);
  return {
    primeRate,
    loanAPrincipal: a.loanAPrincipal,
    loanARate: a.loanARate,
    loanAPayment,
    loanBPrincipal: a.loanBPrincipal,
    loanBRate: primeRate,
    loanBPayment,
    totalPayment: loanAPayment + loanBPayment,
    paymentStartTimelineMonth: a.graceMonths,
    paymentStartOperatingMonth: Math.max(1, a.graceMonths - a.closureMonths + 1),
  };
}

/** One month of the purely contractual (no-sweep) loan schedule. */
export interface ContractualScheduleRow {
  timelineMonth: number;
  loanAOpening: number;
  loanAPayment: number;
  loanAClosing: number;
  loanBOpening: number;
  loanBInterest: number;
  loanBPayment: number;
  loanBClosing: number;
  totalPayment: number;
}

/**
 * The contractual amortisation schedule with no accelerated payoff.
 * Reference: "Financing" sheet, rows 17-79.
 *
 * Used as the baseline for "interest saved" — the model compares the interest actually
 * paid under the sweep plan against the interest this schedule would have cost.
 */
export function contractualSchedule(a: Assumptions, totalMonths: number): ContractualScheduleRow[] {
  const t = loanTerms(a);
  const rows: ContractualScheduleRow[] = [];
  let balanceA = a.loanAPrincipal;
  let balanceB = a.loanBPrincipal;

  for (let month = 0; month <= totalMonths; month++) {
    const openingA = balanceA;
    const openingB = balanceB;

    // Month 0 is the funding month: balances are drawn, nothing is paid.
    const inGrace = month === 0 || month < a.graceMonths;
    const paymentA = inGrace ? 0 : Math.min(t.loanAPayment, openingA);
    const interestB = inGrace ? 0 : (openingB * t.primeRate) / 12;
    const paymentB = inGrace ? 0 : Math.min(t.loanBPayment, openingB + interestB);

    balanceA = Math.max(0, openingA - paymentA);
    balanceB = Math.max(0, openingB + interestB - paymentB);

    rows.push({
      timelineMonth: month,
      loanAOpening: openingA,
      loanAPayment: paymentA,
      loanAClosing: balanceA,
      loanBOpening: openingB,
      loanBInterest: interestB,
      loanBPayment: paymentB,
      loanBClosing: balanceB,
      totalPayment: paymentA + paymentB,
    });
  }
  return rows;
}

/** Total Loan B interest under the contractual schedule — the "interest saved" baseline. */
export function contractualInterestTotal(a: Assumptions, totalMonths: number): number {
  return contractualSchedule(a, totalMonths).reduce((sum, r) => sum + r.loanBInterest, 0);
}
