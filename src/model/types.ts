/**
 * Type definitions for the Shaar Binyamin gym financial model.
 *
 * The model reproduces the reference Google Sheet ("Shaar Binyamin Gym - 5-Year Model.xlsx")
 * exactly. Sheet cell references are noted so any future change can be traced back to
 * the reference implementation.
 */

/** A single editable operating-cost line (reference: "Operating Costs" sheet, rows 5-19). */
export interface OperatingCostLine {
  id: string;
  /** Grouping shown in the UI: Fixed / Staff / Studio / Marketing. */
  category: string;
  /** Human label, e.g. "Rent". */
  name: string;
  /** Monthly gross cash cost including VAT where applicable (column C). */
  monthlyGross: number;
  /** Whether the invoice carries reclaimable VAT (column D). */
  vatable: boolean;
  /** Free-text note (column G). */
  note: string;
}

/** A single startup / build cost line (reference: "Startup & Funding" sheet, rows 5-11). */
export interface StartupCostLine {
  id: string;
  name: string;
  /** Amount excluding VAT (column B). */
  exVat: number;
  /** Whether VAT is charged and therefore reclaimable (column C). */
  vatable: boolean;
  note: string;
}

/** Owner-pay policy for one scenario. All amounts are gross salary per partner per month. */
export interface ScenarioPolicy {
  id: string;
  name: string;
  description: string;
  /**
   * First operating month at which the pre-debt-free salary is paid.
   * Ignored when `preDebtSalary` is 0. (Salary Scenarios row 5.)
   */
  preDebtStartMonth: number;
  /** Gross salary per partner per month before the business is debt-free (row 6). */
  preDebtSalary: number;
  /** Gross salary per partner per month once debt reaches zero (row 7). */
  postDebtSalary: number;
  /** Cash kept in the company before any extra debt payment (row 8 / Inputs B80). */
  cashTarget: number;
  /** Months between debt sweeps (row 9 / Inputs B90). */
  sweepFrequency: number;
  /** First operating month at which a sweep can occur (row 10 / Inputs B91). */
  firstSweepMonth: number;
  /** True for the four shipped defaults; user copies are editable and deletable. */
  builtIn: boolean;
}

/** Every editable input in the model. Defaults mirror the current spreadsheet values. */
export interface Assumptions {
  // --- Business / timeline -------------------------------------------------
  /** Full renovation closure length in months (Inputs B27). */
  closureMonths: number;
  /** Total timeline length: closure + 60 operating months, plus funding month 0. */
  operatingMonths: number;

  // --- Membership ----------------------------------------------------------
  /** Current active paying members (Inputs B24). */
  currentMembers: number;
  /** Share of current members retained at reopening (Inputs B28). */
  retentionAtReopening: number;
  /** Planning capacity cap (Inputs B25). */
  capacity: number;
  /** Organic end-of-year member targets, years 1-5 (Inputs B70:B74). */
  yearEndTargets: [number, number, number, number, number];

  // --- Pricing -------------------------------------------------------------
  /** Full access gym + classes, gross per month (Inputs B38). */
  priceFullAccess: number;
  /** Single service gym OR classes, gross per month (Inputs B39). */
  priceSingleService: number;
  /** Soldier / student program, gross per month (Inputs B40). */
  priceSoldier: number;
  /** Member mix, must sum to 1 (Inputs B41:B43). */
  mixFullAccess: number;
  mixSingleService: number;
  mixSoldier: number;
  /** Base other income gross per month (Inputs B47). */
  otherIncomeGross: number;
  /** Card / payment processing as a share of gross billings (Inputs B49). */
  cardFeeRate: number;
  /** Annual membership price inflation (Inputs B20). */
  priceInflation: number;

  // --- Moatza --------------------------------------------------------------
  /** Moatza deal included (Inputs B50). Base OFF. */
  moatzaEnabled: boolean;
  /** Moatza member block (Inputs B54). */
  moatzaMembers: number;
  /** Moatza gross fee per member per month (Inputs B55). */
  moatzaFee: number;
  /** First operating month the Moatza block is active (Inputs B56). */
  moatzaStartMonth: number;

  // --- Operating costs -----------------------------------------------------
  operatingCosts: OperatingCostLine[];
  /** Annual operating cost inflation (Inputs B19). */
  opexInflation: number;
  /** Economic cost per closure month, ex VAT (Inputs B34). */
  closureCostExVat: number;

  // --- Startup / build -----------------------------------------------------
  startupCosts: StartupCostLine[];
  /** Timeline month in which the build VAT refund lands (Inputs B63). */
  buildVatRefundMonth: number;

  // --- Financing -----------------------------------------------------------
  /** Loan A principal, interest free (Inputs B9). */
  loanAPrincipal: number;
  /** Loan A annual rate (Financing B6). */
  loanARate: number;
  /** Loan B principal, Prime linked (Inputs B10). */
  loanBPrincipal: number;
  /** Bank of Israel policy rate (Inputs B11). */
  boiRate: number;
  /** Prime spread over the BOI rate (Inputs B12). */
  primeSpread: number;
  /** Grace months from funding — no interest and no payments (Inputs B15). */
  graceMonths: number;
  /** Repayment months after grace (Inputs B16). */
  repaymentMonths: number;

  // --- Tax / VAT -----------------------------------------------------------
  /** VAT rate (Inputs B6). */
  vatRate: number;
  /** Corporate tax rate (Inputs B17). */
  corporateTaxRate: number;
  /** Monthly depreciation — tax deduction only, non-cash (Inputs B18). */
  monthlyDepreciation: number;

  // --- Debt sweeps ---------------------------------------------------------
  /** Accelerated payoff on/off (Inputs B79). */
  sweepsEnabled: boolean;
  /** Share of cash above target used at each sweep (Inputs B81). */
  sweepShareOfExcess: number;
  /** No voluntary prepayment before this timeline month (Inputs B82). */
  sweepNotBeforeTimelineMonth: number | null;

  // --- Owner pay -----------------------------------------------------------
  /** Employer load on owner gross salary (Inputs B66). */
  employerLoad: number;
  /** Partner 1 ownership share (Inputs B7). */
  partner1Share: number;
  /** Display name for partner 1. */
  partner1Name: string;
  /** Display name for partner 2. */
  partner2Name: string;
}

export type Phase = 'BUILD' | 'OPEN';

/** Timeline event tags surfaced in the monthly table. */
export type MonthEvent =
  | 'FUNDING'
  | 'BUILD'
  | 'REOPEN'
  | 'DEBT START'
  | 'DEBT SWEEP'
  | 'SALARY START'
  | 'YEAR END'
  | 'DEBT FREE';

export type CashTargetStatus = 'BUILD' | 'BELOW' | 'AT' | 'ABOVE';

/** One fully computed month of the model. */
export interface MonthRow {
  /** 0-based timeline month, 0..62. Month 0 is the funding month. */
  timelineMonth: number;
  phase: Phase;
  /** 0 during build, then 1..60. */
  operatingMonth: number;
  /** Operating year 1..5, or 0 during build. */
  operatingYear: number;

  // Members
  organicMembers: number;
  /** Organic members actually billed after the capacity/Moatza displacement rule. */
  organicBilled: number;
  moatzaMembers: number;
  totalMembers: number;
  blendedFee: number;

  // Cash in (gross, as collected)
  membershipCashIn: number;
  otherCashIn: number;
  startupVatRefund: number;
  totalCashIn: number;

  // Economics (ex VAT) — kept for the accounting view
  netRevenueExVat: number;
  cardFeesExVat: number;
  coreOpexExVat: number;
  ebitda: number;
  depreciation: number;

  // Cash out
  /** Gross collections less EBITDA: day-to-day cash burden including the net VAT effect. */
  operatingCashOut: number;
  loanAScheduled: number;
  loanBScheduled: number;
  loanBInterest: number;
  regularDebtPayment: number;
  extraToLoanB: number;
  extraToLoanA: number;
  extraDebtPayment: number;
  corporateTax: number;
  partner1Gross: number;
  partner2Gross: number;
  employerCosts: number;
  ownerPayrollTotal: number;
  totalCashOut: number;

  // Result
  netCashChange: number;
  openingCash: number;
  endingCash: number;
  loanABalance: number;
  loanBBalance: number;
  debtRemaining: number;

  // Tax detail
  taxableBeforeLoss: number;
  taxLossCarryforwardBegin: number;
  taxLossCarryforwardEnd: number;

  events: MonthEvent[];
  cashTargetStatus: CashTargetStatus;
}

/** Aggregated results for one operating year (12 operating months). */
export interface YearSummary {
  year: number;
  cashIn: number;
  operatingCashOut: number;
  debtPaid: number;
  taxPaid: number;
  ownerPayroll: number;
  totalCashOut: number;
  netCashChange: number;
  endingCash: number;
  debtRemaining: number;
  endMembers: number;
  avgMembers: number;
  ebitda: number;
  grossBillings: number;
}

/** Headline metrics for a scenario run. */
export interface ScenarioResult {
  policy: ScenarioPolicy;
  months: MonthRow[];
  years: YearSummary[];

  /** Operating month in which total debt first reaches zero, or null if never. */
  debtFreeOperatingMonth: number | null;
  /** Timeline month in which total debt first reaches zero. */
  debtFreeTimelineMonth: number | null;
  /** Operating month in which the Prime loan first reaches zero. */
  primeDebtFreeOperatingMonth: number | null;
  /** First operating month with an owner salary. */
  salaryStartOperatingMonth: number | null;

  totalOwnerGrossSalaries: number;
  totalOwnerPayrollCost: number;
  totalExtraDebtPrepayments: number;
  totalLoanBInterestPaid: number;
  /** Contractual interest less interest actually paid. */
  interestSaved: number;

  /** Lowest ending cash across the whole 63-month timeline. */
  minCashFullTimeline: number;
  /** Lowest ending cash from reopening onwards — the number owners care about. */
  minCashAfterReopening: number;
  /** True when the plan goes cash-negative at any point after reopening. */
  liquidityFailure: boolean;

  year5EndingCash: number;
  year5CashAboveTarget: number;
  perPartnerIfDistributed: number;
  monthsDebtEliminatedEarly: number;

  /** Contractual monthly debt service once grace ends. */
  contractualMonthlyDebtService: number;
  reopeningMembers: number;
  /** Cash on hand once the build and the modeled VAT refund are done. */
  cashAfterBuild: number;
}

/** Manually entered actuals for one operating month (Plan vs Actual mode). */
export interface ActualEntry {
  /** Timeline month this entry belongs to. */
  timelineMonth: number;
  members?: number;
  membershipCashIn?: number;
  otherCashIn?: number;
  operatingCashOut?: number;
  debtPayment?: number;
  corporateTax?: number;
  ownerPayroll?: number;
  endingCash?: number;
  note?: string;
}
