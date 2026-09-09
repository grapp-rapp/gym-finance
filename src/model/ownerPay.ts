import type { Assumptions, ScenarioPolicy } from './types';

/**
 * Owner salary policy.
 * Reference: "Salary Scenarios" sheet, columns N / O / P.
 *
 * Rules, in the sheet's own order of precedence:
 *   1. Nothing is paid during the build period.
 *   2. If ALL debt was gone at the end of last month, pay the post-debt salary.
 *   3. Otherwise pay the pre-debt salary, but only from `preDebtStartMonth` onwards
 *      and only when a pre-debt salary is actually configured.
 *
 * Both partners are modelled identically — they are 50/50 and both work in the business.
 */

export interface OwnerPayResult {
  partner1Gross: number;
  partner2Gross: number;
  /** Employer load on top of gross — a real company cash cost. */
  employerCosts: number;
  /** What actually leaves the bank account. */
  totalPayrollCost: number;
}

export interface OwnerPayInput {
  policy: ScenarioPolicy;
  isOperating: boolean;
  operatingMonth: number;
  /** Total debt outstanding at the END of the previous month. */
  previousDebtRemaining: number;
  employerLoad: number;
  /** Funding month 0 never pays a salary. */
  isFundingMonth: boolean;
}

export function ownerPayFor(input: OwnerPayInput): OwnerPayResult {
  const { policy } = input;
  let gross = 0;

  if (!input.isFundingMonth && input.isOperating) {
    if (input.previousDebtRemaining === 0) {
      gross = policy.postDebtSalary;
    } else if (
      input.operatingMonth > 0 &&
      input.operatingMonth >= policy.preDebtStartMonth &&
      policy.preDebtSalary > 0
    ) {
      gross = policy.preDebtSalary;
    }
  }

  const combined = gross * 2;
  const totalPayrollCost = combined * (1 + input.employerLoad);
  return {
    partner1Gross: gross,
    partner2Gross: gross,
    employerCosts: totalPayrollCost - combined,
    totalPayrollCost,
  };
}

/** Company payroll cost for a given combined gross salary. Used by the Inputs screen preview. */
export function payrollCost(combinedGross: number, a: Assumptions): number {
  return combinedGross * (1 + a.employerLoad);
}
