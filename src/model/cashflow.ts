import { coreOpexAt, operatingCostTotals, startupTotals } from './costs';
import { clean } from './excel';
import { contractualInterestTotal, loanTerms } from './financing';
import { blendedFeeAt, moatzaMembersAt, organicBilledAt, organicMembersAt, reopeningMembers } from './membership';
import { ownerPayFor } from './ownerPay';
import { taxStep } from './tax';
import type {
  Assumptions,
  CashTargetStatus,
  MonthEvent,
  MonthRow,
  Phase,
  ScenarioPolicy,
  ScenarioResult,
  YearSummary,
} from './types';

/**
 * THE ENGINE.
 *
 * One pure function: assumptions + owner-pay policy in, 63 fully-computed months out.
 * This is a direct re-implementation of the reference spreadsheet's "Monthly Base" and
 * "Owner Pay" / "Salary Scenarios" sheets. Column letters from those sheets are quoted
 * throughout so any number on screen can be traced back to a specific cell.
 *
 * Month ordering matters: the sweep decision for a month reads that month's cash AFTER
 * scheduled debt, payroll and tax have been paid, and the loan balances it can pay down
 * are the balances remaining after the scheduled payment.
 */
export function runModel(a: Assumptions, policy: ScenarioPolicy): ScenarioResult {
  const totalMonths = a.closureMonths + a.operatingMonths; // 63 rows: month 0 .. month 62
  const terms = loanTerms(a);
  const startup = startupTotals(a);
  const opex = operatingCostTotals(a);
  const sweepNotBefore = a.sweepNotBeforeTimelineMonth ?? a.graceMonths;

  const months: MonthRow[] = [];

  // Carried state
  let previousEndingCash = startup.cashHeadroom; // "Owner Pay" F21 = Startup & Funding B19
  let loanABalance = a.loanAPrincipal;
  let loanBBalance = a.loanBPrincipal;
  let lossCarryforward = 0;
  let previousDebtRemaining = a.loanAPrincipal + a.loanBPrincipal;

  for (let t = 0; t < totalMonths; t++) {
    const phase: Phase = t < a.closureMonths ? 'BUILD' : 'OPEN';
    const operatingMonth = phase === 'OPEN' ? t - a.closureMonths + 1 : 0;
    const operatingYear = operatingMonth > 0 ? Math.ceil(operatingMonth / 12) : 0;

    // --- Members & revenue ("Monthly Base" D-K) ----------------------------
    const organic = organicMembersAt(a, operatingMonth);
    const organicBilled = organicBilledAt(a, operatingMonth);
    const moatza = moatzaMembersAt(a, operatingMonth);
    const totalMembers = organicBilled + moatza;
    const blendedFee = blendedFeeAt(a, operatingMonth);

    const membershipCashIn =
      operatingMonth === 0 ? 0 : organicBilled * blendedFee + moatza * a.moatzaFee;
    const otherCashIn = operatingMonth === 0 ? 0 : a.otherIncomeGross;
    const grossBillings = membershipCashIn + otherCashIn;

    // --- Economics ex VAT ("Monthly Base" L-O) ----------------------------
    const netRevenueExVat = grossBillings / (1 + a.vatRate);
    const cardFeesExVat = (grossBillings * a.cardFeeRate) / (1 + a.vatRate);
    const coreOpexExVat = coreOpexAt(a, operatingMonth, opex.monthlyExVat);
    const ebitda = netRevenueExVat - cardFeesExVat - coreOpexExVat;

    const startupVatRefund = t === a.buildVatRefundMonth ? startup.reclaimableVat : 0;

    // --- Scheduled debt service ("Owner Pay" I-L) -------------------------
    // Grace is genuinely free: no interest accrues and no payment falls due.
    const openingLoanA = loanABalance;
    const openingLoanB = loanBBalance;
    const inGrace = t < a.graceMonths;

    const loanAScheduled = inGrace || openingLoanA <= 0 ? 0 : Math.min(terms.loanAPayment, openingLoanA);
    const loanBInterest = inGrace || openingLoanB <= 0 ? 0 : (openingLoanB * terms.primeRate) / 12;
    const loanBScheduled =
      inGrace || openingLoanB <= 0 ? 0 : Math.min(terms.loanBPayment, openingLoanB + loanBInterest);
    const regularDebtPayment = loanAScheduled + loanBScheduled;

    // --- Owner payroll ("Owner Pay" N-P) ----------------------------------
    const pay = ownerPayFor({
      policy,
      isOperating: phase === 'OPEN',
      operatingMonth,
      previousDebtRemaining,
      employerLoad: a.employerLoad,
      isFundingMonth: t === 0,
    });

    // --- Corporate tax ("Owner Pay" M / Q-S) ------------------------------
    const depreciation = operatingMonth === 0 ? 0 : a.monthlyDepreciation;
    const taxResult = taxStep({
      ebitda,
      loanBInterest,
      depreciation,
      ownerPayrollCost: pay.totalPayrollCost,
      lossCarryforwardBegin: lossCarryforward,
      taxRate: a.corporateTaxRate,
    });

    // --- Cash before any voluntary prepayment ("Owner Pay" T) -------------
    const openingCash = previousEndingCash;
    const cashBeforeExtraDebt =
      openingCash + ebitda + startupVatRefund - regularDebtPayment - pay.totalPayrollCost - taxResult.tax;

    // --- Debt sweep ("Owner Pay" U / V) ----------------------------------
    // Prime debt (Loan B) is always retired before the interest-free Loan A.
    const sweepDue =
      a.sweepsEnabled &&
      phase === 'OPEN' &&
      t >= sweepNotBefore &&
      operatingMonth >= policy.firstSweepMonth &&
      (operatingMonth - policy.firstSweepMonth) % policy.sweepFrequency === 0;

    const excessCash = Math.max(0, cashBeforeExtraDebt - policy.cashTarget) * a.sweepShareOfExcess;
    const loanBAfterScheduled = Math.max(0, openingLoanB + loanBInterest - loanBScheduled);
    const loanAAfterScheduled = Math.max(0, openingLoanA - loanAScheduled);

    const extraToLoanB = sweepDue ? Math.min(excessCash, loanBAfterScheduled) : 0;
    const extraToLoanA = sweepDue
      ? Math.min(Math.max(0, excessCash - extraToLoanB), loanAAfterScheduled)
      : 0;

    const closingLoanA = clean(Math.max(0, loanAAfterScheduled - extraToLoanA));
    const closingLoanB = clean(Math.max(0, loanBAfterScheduled - extraToLoanB));
    const debtRemaining = clean(closingLoanA + closingLoanB);
    const endingCash = cashBeforeExtraDebt - extraToLoanB - extraToLoanA;

    // --- Presentation: pure cash in / cash out ----------------------------
    // "Operating cash out" is gross collections less EBITDA. It is the real day-to-day
    // cash burden (opex, card fees and the net VAT effect) expressed as one number, so
    // cash in − cash out reconciles exactly to the change in bank cash.
    const operatingCashOut = grossBillings - ebitda;
    const extraDebtPayment = extraToLoanB + extraToLoanA;
    const totalCashIn = membershipCashIn + otherCashIn + startupVatRefund;
    const totalCashOut =
      operatingCashOut + regularDebtPayment + extraDebtPayment + taxResult.tax + pay.totalPayrollCost;
    const netCashChange = totalCashIn - totalCashOut;

    // --- Events & status --------------------------------------------------
    const events: MonthEvent[] = [];
    if (t === 0) events.push('FUNDING');
    if (phase === 'BUILD' && t > 0) events.push('BUILD');
    if (operatingMonth === 1) events.push('REOPEN');
    if (t === a.graceMonths && regularDebtPayment > 0) events.push('DEBT START');
    if (extraDebtPayment > 0) events.push('DEBT SWEEP');
    if (pay.partner1Gross + pay.partner2Gross > 0 && previousMonthHadNoSalary(months)) events.push('SALARY START');
    if (debtRemaining === 0 && previousDebtRemaining > 0) events.push('DEBT FREE');
    if (operatingMonth > 0 && operatingMonth % 12 === 0) events.push('YEAR END');

    let cashTargetStatus: CashTargetStatus = 'BUILD';
    if (phase === 'OPEN') {
      const delta = endingCash - policy.cashTarget;
      cashTargetStatus = Math.abs(delta) < 1 ? 'AT' : delta < 0 ? 'BELOW' : 'ABOVE';
    }

    months.push({
      timelineMonth: t,
      phase,
      operatingMonth,
      operatingYear,
      organicMembers: organic,
      organicBilled,
      moatzaMembers: moatza,
      totalMembers,
      blendedFee,
      membershipCashIn,
      otherCashIn,
      startupVatRefund,
      totalCashIn,
      netRevenueExVat,
      cardFeesExVat,
      coreOpexExVat,
      ebitda,
      depreciation,
      operatingCashOut,
      loanAScheduled,
      loanBScheduled,
      loanBInterest,
      regularDebtPayment,
      extraToLoanB,
      extraToLoanA,
      extraDebtPayment,
      corporateTax: taxResult.tax,
      partner1Gross: pay.partner1Gross,
      partner2Gross: pay.partner2Gross,
      employerCosts: pay.employerCosts,
      ownerPayrollTotal: pay.totalPayrollCost,
      totalCashOut,
      netCashChange,
      openingCash,
      endingCash,
      loanABalance: closingLoanA,
      loanBBalance: closingLoanB,
      debtRemaining,
      taxableBeforeLoss: taxResult.taxableBeforeLoss,
      taxLossCarryforwardBegin: lossCarryforward,
      taxLossCarryforwardEnd: taxResult.lossCarryforwardEnd,
      events,
      cashTargetStatus,
    });

    // Carry state forward
    previousEndingCash = endingCash;
    loanABalance = closingLoanA;
    loanBBalance = closingLoanB;
    lossCarryforward = taxResult.lossCarryforwardEnd;
    previousDebtRemaining = debtRemaining;
  }

  return buildResult(a, policy, months, terms.totalPayment, contractualInterestTotal(a, totalMonths - 1), startup.cashAfterClosureAndRefund, reopeningMembers(a));
}

function previousMonthHadNoSalary(months: MonthRow[]): boolean {
  if (months.length === 0) return true;
  return months[months.length - 1].ownerPayrollTotal === 0;
}

function buildResult(
  a: Assumptions,
  policy: ScenarioPolicy,
  months: MonthRow[],
  contractualMonthlyDebtService: number,
  contractualInterest: number,
  cashAfterBuild: number,
  reopening: number,
): ScenarioResult {
  const debtFreeRow = months.find((m) => m.debtRemaining === 0) ?? null;
  const primeFreeRow = months.find((m) => m.loanBBalance === 0) ?? null;
  const salaryRow = months.find((m) => m.partner1Gross + m.partner2Gross > 0 && m.operatingMonth > 0) ?? null;
  const operating = months.filter((m) => m.operatingMonth > 0);
  const last = months[months.length - 1];

  const totalOwnerGrossSalaries = months.reduce((s, m) => s + m.partner1Gross + m.partner2Gross, 0);
  const totalOwnerPayrollCost = months.reduce((s, m) => s + m.ownerPayrollTotal, 0);
  const totalExtraDebtPrepayments = months.reduce((s, m) => s + m.extraDebtPayment, 0);
  const totalLoanBInterestPaid = months.reduce((s, m) => s + m.loanBInterest, 0);

  const minCashFullTimeline = Math.min(...months.map((m) => m.endingCash));
  const minCashAfterReopening = operating.length
    ? Math.min(...operating.map((m) => m.endingCash))
    : minCashFullTimeline;

  const year5CashAboveTarget =
    last.debtRemaining === 0 ? Math.max(0, last.endingCash - policy.cashTarget) : 0;

  return {
    policy,
    months,
    years: summariseYears(months),
    debtFreeOperatingMonth: debtFreeRow ? debtFreeRow.operatingMonth : null,
    debtFreeTimelineMonth: debtFreeRow ? debtFreeRow.timelineMonth : null,
    primeDebtFreeOperatingMonth: primeFreeRow ? primeFreeRow.operatingMonth : null,
    salaryStartOperatingMonth: salaryRow ? salaryRow.operatingMonth : null,
    totalOwnerGrossSalaries,
    totalOwnerPayrollCost,
    totalExtraDebtPrepayments,
    totalLoanBInterestPaid,
    interestSaved: contractualInterest - totalLoanBInterestPaid,
    minCashFullTimeline,
    minCashAfterReopening,
    liquidityFailure: minCashAfterReopening < 0,
    year5EndingCash: last.endingCash,
    year5CashAboveTarget,
    perPartnerIfDistributed: year5CashAboveTarget * a.partner1Share,
    monthsDebtEliminatedEarly: debtFreeRow
      ? Math.max(0, a.graceMonths + a.repaymentMonths - 1 - debtFreeRow.timelineMonth)
      : 0,
    contractualMonthlyDebtService,
    reopeningMembers: reopening,
    cashAfterBuild,
  };
}

/** Roll the 60 operating months up into 5 operating years. Build months are excluded. */
export function summariseYears(months: MonthRow[]): YearSummary[] {
  const years: YearSummary[] = [];
  const maxYear = Math.max(0, ...months.map((m) => m.operatingYear));

  for (let year = 1; year <= maxYear; year++) {
    const rows = months.filter((m) => m.operatingYear === year);
    if (rows.length === 0) continue;
    const lastRow = rows[rows.length - 1];
    const sum = (pick: (m: MonthRow) => number) => rows.reduce((s, m) => s + pick(m), 0);

    years.push({
      year,
      cashIn: sum((m) => m.totalCashIn),
      operatingCashOut: sum((m) => m.operatingCashOut),
      debtPaid: sum((m) => m.regularDebtPayment + m.extraDebtPayment),
      taxPaid: sum((m) => m.corporateTax),
      ownerPayroll: sum((m) => m.ownerPayrollTotal),
      totalCashOut: sum((m) => m.totalCashOut),
      netCashChange: sum((m) => m.netCashChange),
      endingCash: lastRow.endingCash,
      debtRemaining: lastRow.debtRemaining,
      endMembers: lastRow.totalMembers,
      avgMembers: sum((m) => m.totalMembers) / rows.length,
      ebitda: sum((m) => m.ebitda),
      grossBillings: sum((m) => m.membershipCashIn + m.otherCashIn),
    });
  }
  return years;
}
