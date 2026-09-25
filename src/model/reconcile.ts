import { WORKBOOK_ASSUMPTIONS, WORKBOOK_SCENARIOS, NO_SALARY_POLICY } from './assumptions';
import { runModel } from './cashflow';
import { operatingCostTotals, startupTotals } from './costs';
import { contractualInterestTotal, loanTerms } from './financing';
import { blendedMembershipFee, reopeningMembers } from './membership';
import type { Assumptions, ScenarioPolicy } from './types';

/**
 * Spreadsheet-parity reconciliation.
 *
 * Every row states the value the reference workbook produced, the value this app's
 * calculation layer produces from the same inputs, and the difference. This is what
 * proves the model was re-implemented rather than transcribed.
 */

export interface ReconciliationRow {
  group: string;
  metric: string;
  /** Where the number lives in the reference workbook. */
  cell: string;
  spreadsheet: number | string;
  app: number | string;
  difference: number | null;
  /** Difference small enough to be spreadsheet display rounding. */
  match: boolean;
  unit: 'currency' | 'number' | 'month' | 'text';
}

/**
 * The workbook stores computed values to about 10 significant digits, so a
 * ₪1,105,309.8385 balance comes back as 1105309.839. Anything at or below this
 * threshold is storage rounding, not a modelling difference.
 */
export const PARITY_TOLERANCE = 0.005;

function row(
  group: string,
  metric: string,
  cell: string,
  spreadsheet: number | string,
  app: number | string,
  unit: ReconciliationRow['unit'] = 'currency',
): ReconciliationRow {
  if (typeof spreadsheet === 'number' && typeof app === 'number') {
    const difference = app - spreadsheet;
    return {
      group,
      metric,
      cell,
      spreadsheet,
      app,
      difference,
      match: Math.abs(difference) <= PARITY_TOLERANCE,
      unit,
    };
  }
  return {
    group,
    metric,
    cell,
    spreadsheet,
    app,
    difference: null,
    match: String(spreadsheet) === String(app),
    unit: 'text',
  };
}

/** Reference values, read from the workbook at build time by scripts/extract-xlsx.mjs. */
export interface ReferenceValues {
  /** "Salary Scenarios" summary block, one entry per scenario id. */
  scenarios: Record<
    string,
    {
      debtFreeOperatingMonth: number;
      primeDebtFreeOperatingMonth: number;
      salaryStartOperatingMonth: number;
      totalOwnerGrossSalaries: number;
      totalOwnerPayrollCost: number;
      interestSaved: number;
      totalExtraDebtPrepayments: number;
      year5EndingCash: number;
      year5CashAboveTarget: number;
      perPartnerIfDistributed: number;
      minCashFullTimeline: number;
      minCashAfterReopening: number;
      monthsDebtEliminatedEarly: number;
    }
  >;
  structural: {
    operatingCostGross: number;
    operatingCostExVat: number;
    blendedFee: number;
    reopeningMembers: number;
    startupVatRefund: number;
    cashHeadroom: number;
    cashAfterBuild: number;
    loanAPayment: number;
    loanBPayment: number;
    totalDebtService: number;
    primeRate: number;
    contractualInterest: number;
    paymentStartTimelineMonth: number;
    paymentStartOperatingMonth: number;
  };
  /** "Dashboard" rows 13-17 — the base case with owner salaries switched off. */
  dashboardYears: Array<{
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
  }>;
}

/** Build the full reconciliation report against a set of reference values. */
export function buildReconciliation(
  reference: ReferenceValues,
  assumptions: Assumptions = WORKBOOK_ASSUMPTIONS,
  scenarios: ScenarioPolicy[] = WORKBOOK_SCENARIOS,
): ReconciliationRow[] {
  const rows: ReconciliationRow[] = [];
  const opex = operatingCostTotals(assumptions);
  const startup = startupTotals(assumptions);
  const terms = loanTerms(assumptions);
  const totalMonths = assumptions.closureMonths + assumptions.operatingMonths;
  const s = reference.structural;

  // --- Structural inputs ---------------------------------------------------
  const G1 = 'Model foundations';
  rows.push(row(G1, 'Core operating cost — gross / month', "'Operating Costs'!B23", s.operatingCostGross, opex.monthlyGross));
  rows.push(row(G1, 'Core operating cost — ex VAT / month', "'Operating Costs'!C23", s.operatingCostExVat, opex.monthlyExVat));
  rows.push(row(G1, 'Blended membership fee', 'Inputs!B44', s.blendedFee, blendedMembershipFee(assumptions)));
  rows.push(row(G1, 'Reopening members', "'5-Year Summary'!B23", s.reopeningMembers, reopeningMembers(assumptions), 'number'));
  rows.push(row(G1, 'Startup VAT refund', "'Startup & Funding'!B16", s.startupVatRefund, startup.reclaimableVat));
  rows.push(row(G1, 'Cash headroom at funding', "'Startup & Funding'!B19", s.cashHeadroom, startup.cashHeadroom));
  rows.push(row(G1, 'Cash after build + VAT refund', "'Startup & Funding'!B22", s.cashAfterBuild, startup.cashAfterClosureAndRefund));

  const G2 = 'Financing';
  rows.push(row(G2, 'Current Prime rate', 'Inputs!B13', s.primeRate, terms.primeRate, 'number'));
  rows.push(row(G2, 'Loan A monthly payment', 'Financing!B10', s.loanAPayment, terms.loanAPayment));
  rows.push(row(G2, 'Loan B monthly payment', 'Financing!C10', s.loanBPayment, terms.loanBPayment));
  rows.push(row(G2, 'Combined debt service after grace', 'Financing!D10', s.totalDebtService, terms.totalPayment));
  rows.push(row(G2, 'Payments begin — timeline month', 'Financing!D12', s.paymentStartTimelineMonth, terms.paymentStartTimelineMonth, 'month'));
  rows.push(row(G2, 'Payments begin — operating month', 'Financing!D13', s.paymentStartOperatingMonth, terms.paymentStartOperatingMonth, 'month'));
  rows.push(row(G2, 'Contractual Loan B interest (no sweeps)', 'Financing!G17:G79', s.contractualInterest, contractualInterestTotal(assumptions, totalMonths - 1)));

  // --- Base case year table (Dashboard, salaries off) ----------------------
  const baseResult = runModel(assumptions, NO_SALARY_POLICY);
  reference.dashboardYears.forEach((expected, index) => {
    const actual = baseResult.years[index];
    const year = index + 1;
    const G = `Base case — operating year ${year}`;
    rows.push(row(G, 'Cash collected', `Dashboard!B${13 + index}`, expected.cashIn, actual.cashIn));
    rows.push(row(G, 'Operating cash out', `Dashboard!C${13 + index}`, expected.operatingCashOut, actual.operatingCashOut));
    rows.push(row(G, 'Debt paid', `Dashboard!D${13 + index}`, expected.debtPaid, actual.debtPaid));
    rows.push(row(G, 'Tax paid', `Dashboard!E${13 + index}`, expected.taxPaid, actual.taxPaid));
    rows.push(row(G, 'Owner payroll', `Dashboard!F${13 + index}`, expected.ownerPayroll, actual.ownerPayroll));
    rows.push(row(G, 'Total cash out', `Dashboard!G${13 + index}`, expected.totalCashOut, actual.totalCashOut));
    rows.push(row(G, 'Net cash change', `Dashboard!H${13 + index}`, expected.netCashChange, actual.netCashChange));
    rows.push(row(G, 'Ending bank cash', `Dashboard!I${13 + index}`, expected.endingCash, actual.endingCash));
    rows.push(row(G, 'Debt remaining', `Dashboard!J${13 + index}`, expected.debtRemaining, actual.debtRemaining));
    rows.push(row(G, 'End members', `Dashboard!K${13 + index}`, expected.endMembers, actual.endMembers, 'number'));
  });

  // --- Owner-pay scenarios -------------------------------------------------
  const column: Record<string, string> = { A: 'B', B: 'C', C: 'D', D: 'E' };
  for (const policy of scenarios) {
    const expected = reference.scenarios[policy.id];
    if (!expected) continue;
    const actual = runModel(assumptions, policy);
    const G = `Scenario ${policy.name}`;
    const col = column[policy.id] ?? '?';
    const at = (r: number) => `'Salary Scenarios'!${col}${r}`;

    rows.push(row(G, 'Debt-free operating month', at(13), expected.debtFreeOperatingMonth, actual.debtFreeOperatingMonth ?? 'Beyond model', 'month'));
    rows.push(row(G, 'Prime loan debt-free operating month', at(14), expected.primeDebtFreeOperatingMonth, actual.primeDebtFreeOperatingMonth ?? 'Beyond model', 'month'));
    rows.push(row(G, 'First owner salary operating month', at(15), expected.salaryStartOperatingMonth, actual.salaryStartOperatingMonth ?? 'None', 'month'));
    rows.push(row(G, 'Owner gross salaries — 5 years', at(16), expected.totalOwnerGrossSalaries, actual.totalOwnerGrossSalaries));
    rows.push(row(G, 'Company owner payroll — 5 years', at(17), expected.totalOwnerPayrollCost, actual.totalOwnerPayrollCost));
    rows.push(row(G, 'Interest saved', at(18), expected.interestSaved, actual.interestSaved));
    rows.push(row(G, 'Extra lump-sum debt prepayments', at(19), expected.totalExtraDebtPrepayments, actual.totalExtraDebtPrepayments));
    rows.push(row(G, 'Year 5 company cash', at(20), expected.year5EndingCash, actual.year5EndingCash));
    rows.push(row(G, 'Year 5 cash above target', at(21), expected.year5CashAboveTarget, actual.year5CashAboveTarget));
    rows.push(row(G, '50% per partner if distributed', at(22), expected.perPartnerIfDistributed, actual.perPartnerIfDistributed));
    rows.push(row(G, 'Months debt eliminated early', at(23), expected.monthsDebtEliminatedEarly, actual.monthsDebtEliminatedEarly, 'number'));
    rows.push(row(G, 'Minimum cash — full timeline', at(25), expected.minCashFullTimeline, actual.minCashFullTimeline));
    rows.push(row(G, 'Minimum cash after reopening', at(27), expected.minCashAfterReopening, actual.minCashAfterReopening));
  }

  return rows;
}

export interface ReconciliationSummary {
  total: number;
  matched: number;
  mismatched: number;
  worstDifference: number;
  worstMetric: string;
}

/**
 * Render the report as Markdown. Pure, so the same rows drive the on-screen table,
 * the test output and the checked-in RECONCILIATION.md.
 */
export function reconciliationMarkdown(
  rows: ReconciliationRow[],
  summary: ReconciliationSummary,
  sourceFile: string,
  generatedOn: string,
): string {
  const money = (value: number | string) =>
    typeof value === 'number'
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(value);

  const difference = (row: ReconciliationRow) => {
    if (row.difference === null) return row.match ? 'match' : '**DIFFERS**';
    if (row.difference === 0) return '0';
    return row.difference.toExponential(2);
  };

  const lines: string[] = [
    '# Spreadsheet Reconciliation Report',
    '',
    `Generated ${generatedOn} from \`reference/${sourceFile}\`.`,
    '',
    '| | |',
    '| --- | --- |',
    `| Outputs checked | **${summary.total}** |`,
    `| Matched | **${summary.matched}** |`,
    `| Mismatched | **${summary.mismatched}** |`,
    `| Largest difference | ${summary.worstDifference.toExponential(3)} |`,
    `| Where | ${summary.worstMetric} |`,
    `| Tolerance | ${PARITY_TOLERANCE} |`,
    '',
    summary.mismatched === 0
      ? "> **Full parity.** Every checked output matches the reference workbook. The largest difference anywhere is smaller than the workbook's own storage precision — it keeps about ten significant digits, so ₪1,105,309.8385 is stored as `1105309.839`. These are display-precision artefacts in the source file, not modelling differences."
      : `> **${summary.mismatched} outputs differ** and need investigating.`,
    '',
    'Reproduce with `npm test` (220 assertions, roughly 8,000 individual cell comparisons)',
    'or regenerate this file with `npm run reconcile`.',
    '',
  ];

  let group = '';
  for (const row of rows) {
    if (row.group !== group) {
      group = row.group;
      lines.push('', `## ${group}`, '');
      lines.push('| Metric | Spreadsheet | App | Difference | Source cell |');
      lines.push('| --- | ---: | ---: | ---: | --- |');
    }
    lines.push(
      `| ${row.metric} | ${money(row.spreadsheet)} | ${money(row.app)} | ${difference(row)} | \`${row.cell}\` |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function summariseReconciliation(rows: ReconciliationRow[]): ReconciliationSummary {
  let worstDifference = 0;
  let worstMetric = '—';
  let matched = 0;
  for (const r of rows) {
    if (r.match) matched += 1;
    const diff = Math.abs(r.difference ?? 0);
    if (diff > worstDifference) {
      worstDifference = diff;
      worstMetric = `${r.group} · ${r.metric}`;
    }
  }
  return {
    total: rows.length,
    matched,
    mismatched: rows.length - matched,
    worstDifference,
    worstMetric,
  };
}
