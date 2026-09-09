import type { Assumptions, OperatingCostLine, ScenarioPolicy, StartupCostLine } from './types';

/**
 * Default assumptions. Every value here is the CURRENT value in the reference
 * spreadsheet — nothing is hardcoded into the calculation layer, so all of these
 * can be edited at runtime and the model recomputes.
 */

/** Reference: "Operating Costs" sheet, rows 5-19. Gross ₪69,849/mo, ex-VAT ₪63,913.73/mo. */
export const DEFAULT_OPERATING_COSTS: OperatingCostLine[] = [
  { id: 'rent', category: 'Fixed', name: 'Rent', monthlyGross: 20000, vatable: true, note: 'Incl VAT; user confirmed' },
  { id: 'arnona', category: 'Fixed', name: 'Arnona', monthlyGross: 4500, vatable: false, note: 'Municipal property tax' },
  { id: 'electricity', category: 'Fixed', name: 'Electricity', monthlyGross: 4000, vatable: true, note: '' },
  { id: 'water', category: 'Fixed', name: 'Water', monthlyGross: 1500, vatable: true, note: '' },
  { id: 'cleaning', category: 'Fixed', name: 'Cleaning — outsourced', monthlyGross: 3500, vatable: true, note: 'Outsourced cleaning allowance' },
  { id: 'accounting', category: 'Fixed', name: 'Accounting', monthlyGross: 1800, vatable: true, note: 'Monthly accounting allowance' },
  { id: 'software', category: 'Fixed', name: 'Software / CRM / access', monthlyGross: 1500, vatable: true, note: 'Automated access stack' },
  { id: 'phone', category: 'Fixed', name: 'Phone + mobile + comms', monthlyGross: 1059, vatable: true, note: '' },
  { id: 'maintenance', category: 'Fixed', name: 'Maintenance', monthlyGross: 1000, vatable: true, note: 'Allowance' },
  { id: 'insurance', category: 'Fixed', name: 'Insurance', monthlyGross: 600, vatable: false, note: 'Current actual; re-quote rebuilt facility' },
  { id: 'office', category: 'Fixed', name: 'Office / signage / sundries', monthlyGross: 250, vatable: true, note: 'Allowance' },
  { id: 'management', category: 'Fixed', name: 'Management fee', monthlyGross: 2300, vatable: true, note: 'Confirmed real' },
  { id: 'hodaya', category: 'Staff', name: 'Hodaya — loaded payroll', monthlyGross: 8304, vatable: false, note: '173 hrs × 40 + 20% employer costs' },
  { id: 'studio', category: 'Studio', name: 'Studio instructors — 27 classes/week', monthlyGross: 17536, vatable: false, note: '27 × ₪150/class; conservative non-VAT treatment' },
  { id: 'marketing', category: 'Marketing', name: 'Ongoing marketing', monthlyGross: 2000, vatable: true, note: 'Recurring' },
];

/** Reference: "Startup & Funding" sheet, rows 5-11. */
export const DEFAULT_STARTUP_COSTS: StartupCostLine[] = [
  { id: 'business-plan', name: 'Business plan', exVat: 9000, vatable: true, note: 'Consultant' },
  { id: 'plans', name: 'Plans & consultants', exVat: 90000, vatable: true, note: 'Consultant' },
  { id: 'build', name: 'Build / renovation', exVat: 200000, vatable: true, note: 'Consultant' },
  { id: 'op-equipment', name: 'Operational equipment', exVat: 146000, vatable: true, note: 'Consultant' },
  { id: 'gym-equipment', name: 'Professional gym equipment', exVat: 399076.27, vatable: true, note: 'Eurotec quote — exact' },
  { id: 'run-in', name: 'Run-in reserve', exVat: 75000, vatable: false, note: 'Working-capital reserve, not a VATable invoice' },
  { id: 'presale', name: 'Optional extra presale marketing', exVat: 0, vatable: true, note: 'Only if activated' },
];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  closureMonths: 3,
  operatingMonths: 60,

  currentMembers: 317,
  retentionAtReopening: 0.75,
  capacity: 850,
  yearEndTargets: [450, 600, 725, 800, 850],

  priceFullAccess: 230,
  priceSingleService: 200,
  priceSoldier: 150,
  mixFullAccess: 0.85,
  mixSingleService: 0.1,
  mixSoldier: 0.05,
  otherIncomeGross: 6500,
  cardFeeRate: 0.01,
  priceInflation: 0,

  moatzaEnabled: false,
  moatzaMembers: 300,
  moatzaFee: 190,
  moatzaStartMonth: 8,

  operatingCosts: DEFAULT_OPERATING_COSTS,
  opexInflation: 0,
  closureCostExVat: 20018,

  startupCosts: DEFAULT_STARTUP_COSTS,
  buildVatRefundMonth: 2,

  loanAPrincipal: 240000,
  loanARate: 0,
  loanBPrincipal: 900000,
  boiRate: 0.0325,
  primeSpread: 0.015,
  graceMonths: 12,
  repaymentMonths: 60,

  vatRate: 0.18,
  corporateTaxRate: 0.23,
  monthlyDepreciation: 6813,

  sweepsEnabled: true,
  sweepShareOfExcess: 1,
  /** null = follow the grace period, matching the spreadsheet formula Inputs!B82 = B15. */
  sweepNotBeforeTimelineMonth: null,

  employerLoad: 0.2,
  partner1Share: 0.5,
  partner1Name: 'Gershon',
  partner2Name: 'Yishai',
};

/**
 * The four shipped owner-pay scenarios.
 * Reference: "Salary Scenarios" sheet, columns B-E, rows 5-10.
 */
export const DEFAULT_SCENARIOS: ScenarioPolicy[] = [
  {
    id: 'A',
    name: 'A — Debt-Max',
    description: 'No owner salary before debt-free. ₪10k gross each per month afterwards.',
    preDebtStartMonth: 0,
    preDebtSalary: 0,
    postDebtSalary: 10000,
    cashTarget: 150000,
    sweepFrequency: 6,
    firstSweepMonth: 12,
    builtIn: true,
  },
  {
    id: 'B',
    name: 'B — Balanced',
    description: '₪5k gross each from operating month 13; ₪10k each once debt-free.',
    preDebtStartMonth: 13,
    preDebtSalary: 5000,
    postDebtSalary: 10000,
    cashTarget: 150000,
    sweepFrequency: 6,
    firstSweepMonth: 12,
    builtIn: true,
  },
  {
    id: 'C',
    name: 'C — Earlier Full Owner Pay',
    description: '₪10k gross each from operating month 7 and thereafter.',
    preDebtStartMonth: 7,
    preDebtSalary: 10000,
    postDebtSalary: 10000,
    cashTarget: 150000,
    sweepFrequency: 6,
    firstSweepMonth: 12,
    builtIn: true,
  },
  {
    id: 'D',
    name: 'D — Early Balanced',
    description: '₪5k gross each from operating month 7; ₪10k each once debt-free.',
    preDebtStartMonth: 7,
    preDebtSalary: 5000,
    postDebtSalary: 10000,
    cashTarget: 150000,
    sweepFrequency: 6,
    firstSweepMonth: 12,
    builtIn: true,
  },
];

/**
 * The spreadsheet's own "Owner Pay" tab runs with owner salaries switched off entirely
 * (Inputs B84 = 0). Kept so the reconciliation report can compare against that tab too.
 */
export const NO_SALARY_POLICY: ScenarioPolicy = {
  id: 'no-salary',
  name: 'Reference — salaries off',
  description: 'Matches the spreadsheet Owner Pay tab with Inputs!B84 = 0.',
  preDebtStartMonth: 0,
  preDebtSalary: 0,
  postDebtSalary: 0,
  cashTarget: 150000,
  sweepFrequency: 6,
  firstSweepMonth: 12,
  builtIn: true,
};
