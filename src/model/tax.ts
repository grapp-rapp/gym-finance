/**
 * Corporate tax with a loss carry-forward.
 * Reference: "Owner Pay" sheet, columns M / Q / R / S.
 *
 * Taxable income is EBITDA less Loan B interest, less depreciation (operating months only),
 * less the company's owner payroll cost. Losses accumulate and shelter later profits.
 * Depreciation is a tax deduction only — it never touches bank cash.
 */

export interface TaxStepInput {
  ebitda: number;
  loanBInterest: number;
  depreciation: number;
  ownerPayrollCost: number;
  /** Loss carry-forward brought into this month. */
  lossCarryforwardBegin: number;
  taxRate: number;
}

export interface TaxStepResult {
  taxableBeforeLoss: number;
  taxableAfterLoss: number;
  tax: number;
  lossCarryforwardEnd: number;
}

export function taxStep(input: TaxStepInput): TaxStepResult {
  const taxableBeforeLoss =
    input.ebitda - input.loanBInterest - input.depreciation - input.ownerPayrollCost;

  const taxableAfterLoss = Math.max(0, taxableBeforeLoss - input.lossCarryforwardBegin);
  const tax = taxableAfterLoss * input.taxRate;

  // Losses consumed by this month's profit are released; a fresh loss is added.
  const lossCarryforwardEnd =
    Math.max(0, input.lossCarryforwardBegin - Math.max(0, taxableBeforeLoss)) +
    Math.max(0, -taxableBeforeLoss);

  return { taxableBeforeLoss, taxableAfterLoss, tax, lossCarryforwardEnd };
}
