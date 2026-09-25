import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/spreadsheet.json';
import { WORKBOOK_ASSUMPTIONS, DEFAULT_SCENARIOS, NO_SALARY_POLICY } from '../assumptions';
import { runModel } from '../cashflow';
import { operatingCostTotals, startupTotals } from '../costs';
import { contractualSchedule, loanTerms } from '../financing';
import { blendedMembershipFee, organicMembersAt, reopeningMembers } from '../membership';
import type { MonthRow, ScenarioPolicy } from '../types';

/**
 * SPREADSHEET PARITY.
 *
 * These tests compare this app's calculation layer, cell by cell and month by month,
 * against the values the reference workbook actually produced. The fixture is generated
 * by `npm run extract` straight from the .xlsx — no number in it was typed by hand.
 *
 * Tolerance: the workbook stores computed values to roughly ten significant digits, so a
 * balance of ₪1,105,309.8385 is stored as 1105309.839. Half a cent of tolerance covers
 * that storage rounding while still catching any real modelling difference.
 */
const TOL = 0.005;

type Grid = Array<Record<string, number | string | null>>;

const a = WORKBOOK_ASSUMPTIONS;
const scenarioById = (id: string): ScenarioPolicy => {
  const found = DEFAULT_SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`No scenario ${id}`);
  return found;
};

/** Assert a single value against the workbook within the storage-rounding tolerance. */
function expectWithinTolerance(label: string, actual: number, expected: number) {
  const difference = Math.abs(actual - expected);
  expect(
    difference <= TOL,
    `${label}: sheet=${expected} app=${actual} diff=${difference}`,
  ).toBe(true);
}

/** Assert one model column against one spreadsheet column across all 63 months. */
function expectColumn(
  label: string,
  months: MonthRow[],
  grid: Grid,
  column: string,
  pick: (m: MonthRow) => number,
) {
  const failures: string[] = [];
  for (let i = 0; i < grid.length; i++) {
    const expected = grid[i][column];
    if (typeof expected !== 'number') continue;
    const actual = pick(months[i]);
    if (Math.abs(actual - expected) > TOL) {
      failures.push(
        `  timeline month ${i}: sheet=${expected} app=${actual} diff=${(actual - expected).toFixed(6)}`,
      );
    }
  }
  expect(failures.join('\n'), `${label} (column ${column})`).toBe('');
}

describe('Foundations — inputs the whole model rests on', () => {
  it('blended membership fee matches Inputs!B44', () => {
    expect(blendedMembershipFee(a)).toBeCloseTo(fixture.inputs.B44 as number, 6);
  });

  it('reopening members matches the sheet (317 × 75% = 238)', () => {
    expect(reopeningMembers(a)).toBe(fixture.monthlyBase[3].D);
    expect(reopeningMembers(a)).toBe(238);
  });

  it('operating cost totals match Operating Costs!B23 and C23', () => {
    const totals = operatingCostTotals(a);
    expectWithinTolerance('Gross opex', totals.monthlyGross, fixture.operatingCosts.B23 as number);
    expectWithinTolerance('Ex-VAT opex', totals.monthlyExVat, fixture.operatingCosts.C23 as number);
  });

  it('startup totals match the Startup & Funding bridge', () => {
    const totals = startupTotals(a);
    expectWithinTolerance('Total ex VAT', totals.totalExVat, fixture.startup.B15 as number);
    expectWithinTolerance('Reclaimable VAT', totals.reclaimableVat, fixture.startup.B16 as number);
    expectWithinTolerance('Gross cash', totals.grossCash, fixture.startup.B17 as number);
    expectWithinTolerance('Cash headroom', totals.cashHeadroom, fixture.startup.B19 as number);
    expectWithinTolerance('Closure cost', totals.closureCost, fixture.startup.B20 as number);
    expectWithinTolerance('Cash after build', totals.cashAfterClosureAndRefund, fixture.startup.B22 as number);
  });

  it('loan terms match the Financing sheet', () => {
    const terms = loanTerms(a);
    expect(terms.primeRate).toBeCloseTo(fixture.inputs.B13 as number, 10);
    expect(terms.loanAPayment).toBeCloseTo(fixture.financing[0] ? 4000 : 4000, 6);
    expect(terms.loanBPayment).toBeCloseTo(16881.22078119838, 6);
    expect(terms.totalPayment).toBeCloseTo(20881.22078119838, 6);
    expect(terms.paymentStartTimelineMonth).toBe(12);
    expect(terms.paymentStartOperatingMonth).toBe(10);
  });
});

describe('Membership ramp — Monthly Base column D', () => {
  it('matches every one of the 60 operating months', () => {
    const failures: string[] = [];
    for (let i = 0; i < fixture.monthlyBase.length; i++) {
      const rowRecord = fixture.monthlyBase[i] as Record<string, number | string | null>;
      const operatingMonth = rowRecord.C as number;
      const expected = rowRecord.D as number;
      const actual = organicMembersAt(a, operatingMonth);
      if (actual !== expected) {
        failures.push(`  op month ${operatingMonth}: sheet=${expected} app=${actual}`);
      }
    }
    expect(failures.join('\n')).toBe('');
  });

  it('hits the year-end targets exactly', () => {
    expect(organicMembersAt(a, 12)).toBe(450);
    expect(organicMembersAt(a, 24)).toBe(600);
    expect(organicMembersAt(a, 36)).toBe(725);
    expect(organicMembersAt(a, 48)).toBe(800);
    expect(organicMembersAt(a, 60)).toBe(850);
  });
});

describe('Contractual loan schedule — Financing rows 17-79', () => {
  const schedule = contractualSchedule(a, 62);
  const grid = fixture.financing as Grid;

  it('reproduces the whole 63-month schedule', () => {
    const failures: string[] = [];
    const columns: Array<[string, (r: (typeof schedule)[number]) => number]> = [
      ['B', (r) => r.loanAOpening],
      ['D', (r) => r.loanAPayment],
      ['E', (r) => r.loanAClosing],
      ['F', (r) => r.loanBOpening],
      ['G', (r) => r.loanBInterest],
      ['H', (r) => r.loanBPayment],
      ['I', (r) => r.loanBClosing],
      ['J', (r) => r.totalPayment],
    ];
    for (let i = 0; i < grid.length; i++) {
      for (const [column, pick] of columns) {
        const expected = grid[i][column];
        if (typeof expected !== 'number') continue;
        const actual = pick(schedule[i]);
        if (Math.abs(actual - expected) > TOL) {
          failures.push(`  month ${i} col ${column}: sheet=${expected} app=${actual}`);
        }
      }
    }
    expect(failures.join('\n')).toBe('');
  });

  it('grace is genuinely free — no interest and no payment before timeline month 12', () => {
    for (let m = 0; m < 12; m++) {
      expect(schedule[m].loanBInterest, `month ${m} interest`).toBe(0);
      expect(schedule[m].totalPayment, `month ${m} payment`).toBe(0);
    }
    expect(schedule[12].totalPayment).toBeCloseTo(20881.22078119838, 6);
  });
});

describe('Monthly Base — revenue and EBITDA engine', () => {
  const months = runModel(a, scenarioById('A')).months;
  const grid = fixture.monthlyBase as Grid;

  const cases: Array<[string, string, (m: MonthRow) => number]> = [
    ['Organic members', 'D', (m) => m.organicMembers],
    ['Organic billed', 'E', (m) => m.organicBilled],
    ['Moatza members', 'F', (m) => m.moatzaMembers],
    ['Total members', 'G', (m) => m.totalMembers],
    ['Blended fee', 'H', (m) => m.blendedFee],
    ['Membership gross', 'I', (m) => m.membershipCashIn],
    ['Other gross', 'J', (m) => m.otherCashIn],
    ['Total gross billings', 'K', (m) => m.membershipCashIn + m.otherCashIn],
    ['Net revenue ex VAT', 'L', (m) => m.netRevenueExVat],
    ['Card fees ex VAT', 'M', (m) => m.cardFeesExVat],
    ['Core opex ex VAT', 'N', (m) => m.coreOpexExVat],
    ['EBITDA', 'O', (m) => m.ebitda],
    ['Depreciation', 'R', (m) => m.depreciation],
    ['Startup VAT refund', 'Y', (m) => m.startupVatRefund],
  ];

  for (const [label, column, pick] of cases) {
    it(`${label} matches column ${column} for all 63 months`, () => {
      expectColumn(label, months, grid, column, pick);
    });
  }
});

/**
 * The sweep + owner-pay engine. Each scenario block on the "Salary Scenarios" sheet is
 * 63 rows × 26 columns; this checks all of them.
 */
const ENGINE_CASES: Array<[string, string, (m: MonthRow) => number]> = [
  ['EBITDA', 'D', (m) => m.ebitda],
  ['Build VAT refund', 'E', (m) => m.startupVatRefund],
  ['Opening cash', 'F', (m) => m.openingCash],
  ['Loan A opening', 'G', (m) => m.loanABalance + m.loanAScheduled + m.extraToLoanA],
  ['Loan A scheduled', 'I', (m) => m.loanAScheduled],
  ['Loan B interest', 'J', (m) => m.loanBInterest],
  ['Loan B scheduled', 'K', (m) => m.loanBScheduled],
  ['Scheduled debt', 'L', (m) => m.regularDebtPayment],
  ['Tax loss CF begin', 'M', (m) => m.taxLossCarryforwardBegin],
  ['Partner 1 gross', 'N', (m) => m.partner1Gross],
  ['Partner 2 gross', 'O', (m) => m.partner2Gross],
  ['Owner payroll cost', 'P', (m) => m.ownerPayrollTotal],
  ['Taxable before loss', 'Q', (m) => m.taxableBeforeLoss],
  ['Corporate tax', 'R', (m) => m.corporateTax],
  ['Tax loss CF end', 'S', (m) => m.taxLossCarryforwardEnd],
  ['Cash before extra debt', 'T', (m) => m.endingCash + m.extraDebtPayment],
  ['Extra to Loan B', 'U', (m) => m.extraToLoanB],
  ['Extra to Loan A', 'V', (m) => m.extraToLoanA],
  ['Loan A closing', 'W', (m) => m.loanABalance],
  ['Loan B closing', 'X', (m) => m.loanBBalance],
  ['Total debt', 'Y', (m) => m.debtRemaining],
  ['Ending cash', 'Z', (m) => m.endingCash],
];

describe('Owner Pay engine — spreadsheet base case (salaries off)', () => {
  const months = runModel(a, NO_SALARY_POLICY).months;
  const grid = fixture.ownerPayBase as Grid;
  for (const [label, column, pick] of ENGINE_CASES) {
    it(`${label} matches Owner Pay column ${column}`, () => {
      expectColumn(label, months, grid, column, pick);
    });
  }
});

const SCENARIO_GRIDS: Record<string, Grid> = {
  A: fixture.scenarioA as Grid,
  B: fixture.scenarioB as Grid,
  C: fixture.scenarioC as Grid,
  D: fixture.scenarioD as Grid,
};

for (const id of ['A', 'B', 'C', 'D']) {
  describe(`Scenario ${id} — all 63 months × 22 columns`, () => {
    const months = runModel(a, scenarioById(id)).months;
    const grid = SCENARIO_GRIDS[id];
    for (const [label, column, pick] of ENGINE_CASES) {
      it(`${label} matches column ${column}`, () => {
        expectColumn(`Scenario ${id} ${label}`, months, grid, column, pick);
      });
    }
  });
}

describe('Monthly Cash Flow presentation — sheet 10', () => {
  const months = runModel(a, NO_SALARY_POLICY).months;
  const grid = fixture.cashFlow as Grid;

  const cases: Array<[string, string, (m: MonthRow) => number]> = [
    ['Total members', 'D', (m) => m.totalMembers],
    ['Membership cash in', 'E', (m) => m.membershipCashIn],
    ['Other cash in', 'F', (m) => m.otherCashIn],
    ['Startup VAT refund', 'G', (m) => m.startupVatRefund],
    ['Total cash in', 'H', (m) => m.totalCashIn],
    ['Operating cash out', 'I', (m) => m.operatingCashOut],
    ['Regular debt payment', 'J', (m) => m.regularDebtPayment],
    ['Lump-sum debt payment', 'K', (m) => m.extraDebtPayment],
    ['Corporate tax', 'L', (m) => m.corporateTax],
    ['Owner payroll', 'M', (m) => m.ownerPayrollTotal],
    ['Total cash out', 'N', (m) => m.totalCashOut],
    ['Net cash change', 'O', (m) => m.netCashChange],
    ['Opening bank cash', 'P', (m) => m.openingCash],
    ['Ending bank cash', 'Q', (m) => m.endingCash],
    ['Debt remaining', 'R', (m) => m.debtRemaining],
  ];

  for (const [label, column, pick] of cases) {
    it(`${label} matches column ${column}`, () => {
      expectColumn(label, months, grid, column, pick);
    });
  }

  it('cash in minus cash out reconciles to the change in bank cash, every month', () => {
    for (const m of months) {
      expect(m.totalCashIn - m.totalCashOut, `month ${m.timelineMonth}`).toBeCloseTo(
        m.endingCash - m.openingCash,
        6,
      );
    }
  });
});

describe('Dashboard 5-year table — base case with salaries off', () => {
  const result = runModel(a, NO_SALARY_POLICY);
  const grid = fixture.dashboardYears as Grid;

  const cases: Array<[string, string, keyof (typeof result.years)[number]]> = [
    ['Cash in', 'B', 'cashIn'],
    ['Operating cash out', 'C', 'operatingCashOut'],
    ['Debt paid', 'D', 'debtPaid'],
    ['Tax paid', 'E', 'taxPaid'],
    ['Owner payroll', 'F', 'ownerPayroll'],
    ['Total cash out', 'G', 'totalCashOut'],
    ['Net cash change', 'H', 'netCashChange'],
    ['Ending bank cash', 'I', 'endingCash'],
    ['Debt remaining', 'J', 'debtRemaining'],
    ['End members', 'K', 'endMembers'],
  ];

  for (const [label, column, key] of cases) {
    it(`${label} matches all 5 years`, () => {
      for (let y = 0; y < 5; y++) {
        const expected = grid[y][column] as number;
        expect(result.years[y][key] as number, `${label} year ${y + 1}`).toBeCloseTo(expected, 2);
      }
    });
  }
});

describe('Scenario headline metrics — Salary Scenarios rows 13-27', () => {
  const summary = fixture.scenarioSummary as Record<string, Record<string, number | string>>;
  const column: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D' };

  for (const id of ['A', 'B', 'C', 'D']) {
    describe(`Scenario ${id}`, () => {
      const result = runModel(a, scenarioById(id));
      const col = column[id];

      it('debt-free operating month', () => {
        expect(result.debtFreeOperatingMonth).toBe(summary.R13[col]);
      });
      it('Prime loan debt-free operating month', () => {
        expect(result.primeDebtFreeOperatingMonth).toBe(summary.R14[col]);
      });
      it('first owner salary operating month', () => {
        expect(result.salaryStartOperatingMonth).toBe(summary.R15[col]);
      });
      it('total owner gross salaries over 5 years', () => {
        expect(result.totalOwnerGrossSalaries).toBeCloseTo(summary.R16[col] as number, 2);
      });
      it('company owner payroll over 5 years', () => {
        expect(result.totalOwnerPayrollCost).toBeCloseTo(summary.R17[col] as number, 2);
      });
      it('interest saved', () => {
        expect(result.interestSaved).toBeCloseTo(summary.R18[col] as number, 2);
      });
      it('total extra lump-sum prepayments', () => {
        expect(result.totalExtraDebtPrepayments).toBeCloseTo(summary.R19[col] as number, 2);
      });
      it('year 5 company cash', () => {
        expect(result.year5EndingCash).toBeCloseTo(summary.R20[col] as number, 2);
      });
      it('year 5 cash above target', () => {
        expect(result.year5CashAboveTarget).toBeCloseTo(summary.R21[col] as number, 2);
      });
      it('50% per partner if distributed', () => {
        expect(result.perPartnerIfDistributed).toBeCloseTo(summary.R22[col] as number, 2);
      });
      it('months debt eliminated early', () => {
        expect(result.monthsDebtEliminatedEarly).toBe(summary.R23[col]);
      });
      it('minimum cash — full timeline', () => {
        expect(result.minCashFullTimeline).toBeCloseTo(summary.R25[col] as number, 2);
      });
      it('minimum cash after reopening', () => {
        expect(result.minCashAfterReopening).toBeCloseTo(summary.R27[col] as number, 2);
      });
    });
  }
});

describe('Documented checkpoints from the brief', () => {
  it('A — Debt-Max', () => {
    const r = runModel(a, scenarioById('A'));
    expect(r.debtFreeOperatingMonth).toBe(42);
    expect(r.primeDebtFreeOperatingMonth).toBe(36);
    expect(r.salaryStartOperatingMonth).toBe(43);
    expect(r.totalOwnerGrossSalaries).toBe(360000);
    expect(r.totalOwnerPayrollCost).toBe(432000);
    expect(r.interestSaved).toBeCloseTo(48787, 0);
    expect(r.totalExtraDebtPrepayments).toBeCloseTo(613329, 0);
    expect(r.year5EndingCash).toBeCloseTo(1469751, 0);
    expect(r.year5CashAboveTarget).toBeCloseTo(1319751, 0);
    expect(r.perPartnerIfDistributed).toBeCloseTo(659875, 0);
    expect(r.minCashAfterReopening).toBeCloseTo(126844, 0);
    expect(r.liquidityFailure).toBe(false);
  });

  it('B — Balanced', () => {
    const r = runModel(a, scenarioById('B'));
    expect(r.debtFreeOperatingMonth).toBe(42);
    expect(r.primeDebtFreeOperatingMonth).toBe(42);
    expect(r.salaryStartOperatingMonth).toBe(13);
    expect(r.totalOwnerGrossSalaries).toBe(660000);
    expect(r.totalOwnerPayrollCost).toBe(792000);
    expect(r.interestSaved).toBeCloseTo(37952, 0);
    expect(r.year5EndingCash).toBeCloseTo(1184208, 0);
    expect(r.year5CashAboveTarget).toBeCloseTo(1034208, 0);
    expect(r.perPartnerIfDistributed).toBeCloseTo(517104, 0);
    expect(r.minCashAfterReopening).toBeCloseTo(126844, 0);
    expect(r.liquidityFailure).toBe(false);
  });

  it('C — Earlier full owner pay is a liquidity failure', () => {
    const r = runModel(a, scenarioById('C'));
    expect(r.debtFreeOperatingMonth).toBe(54);
    expect(r.salaryStartOperatingMonth).toBe(7);
    expect(r.minCashAfterReopening).toBeCloseTo(-43608, 0);
    expect(r.liquidityFailure).toBe(true);
  });

  it('D — Early Balanced', () => {
    const r = runModel(a, scenarioById('D'));
    expect(r.debtFreeOperatingMonth).toBe(47);
    expect(r.primeDebtFreeOperatingMonth).toBe(42);
    expect(r.salaryStartOperatingMonth).toBe(7);
    expect(r.totalOwnerGrossSalaries).toBe(670000);
    expect(r.totalOwnerPayrollCost).toBe(804000);
    expect(r.interestSaved).toBeCloseTo(32748, 0);
    expect(r.year5EndingCash).toBeCloseTo(1170961, 0);
    expect(r.year5CashAboveTarget).toBeCloseTo(1020961, 0);
    expect(r.perPartnerIfDistributed).toBeCloseTo(510480, 0);
    expect(r.minCashAfterReopening).toBeCloseTo(89793, 0);
    expect(r.liquidityFailure).toBe(false);
  });

  it('cash after build + modelled VAT refund is ~₪160,870', () => {
    const r = runModel(a, scenarioById('A'));
    expect(r.cashAfterBuild).toBeCloseTo(160869.73, 2);
    expect(r.months[2].endingCash).toBeCloseTo(160869.73, 2);
  });

  it('contractual debt service after grace is ~₪20,881/month', () => {
    expect(loanTerms(a).totalPayment).toBeCloseTo(20881.22, 2);
  });
});
