import { blendedMembershipFee } from './membership';
import type { AcquisitionPlan, Assumptions, ScenarioPolicy, StartupCostLine } from './types';

export const ACQUISITION_POLICY: ScenarioPolicy = {
  id: 'lean-launch', name: 'Lean launch — owners unpaid', description: 'No owner salaries until you explicitly choose a salary scenario.',
  preDebtStartMonth: 0, preDebtSalary: 0, postDebtSalary: 0, cashTarget: 100000,
  sweepFrequency: 6, firstSweepMonth: 12, builtIn: true,
};

export const ACQUISITION_GROWTH_TARGETS: [number, number, number, number, number] = [450, 550, 650, 725, 800];

/** Older flat acquisition plans get the requested growth path; preserve custom manual growth. */
export function acquisitionGrowth(p: AcquisitionPlan) {
  return p.growth ?? {
    enabled: p.newMembersPerMonth === 0 && p.annualRevenueGrowth === 0,
    yearEndTargets: [...ACQUISITION_GROWTH_TARGETS] as [number, number, number, number, number],
  };
}

export function acquisitionMemberTarget(a: Assumptions, month: number) {
  const targets = acquisitionGrowth(a.acquisition!).yearEndTargets;
  const year = Math.min(4, Math.floor((Math.max(1, month) - 1) / 12));
  const start = year === 0 ? a.currentMembers : targets[year - 1];
  const progress = year === 0 ? (Math.max(1, month) - 1) / 11 : (month - year * 12) / 12;
  return Math.min(a.capacity, Math.max(0, Math.round(start + (targets[year] - start) * Math.min(1, progress))));
}

export function acquisitionDefaults(): AcquisitionPlan {
  return {
    enabled: true, purchaseGross: 150000, purchaseVatable: false, contingencyRate: 0.15, adminGross: 15000, sellerSettlementGross: 0,
    growth: { enabled: true, yearEndTargets: [...ACQUISITION_GROWTH_TARGETS] },
    renovation: [
      { id: 'floor', name: 'Flooring', gross: 65000, vatable: true, note: 'Planning allowance: approximately 300 m² × ₪217 installed. Measure the area and obtain quotes.' },
      { id: 'paint', name: 'Painting and wall repairs', gross: 20000, vatable: true, note: 'Cosmetic work; allow more for high ceilings or damaged surfaces.' },
      { id: 'bathrooms', name: 'Bathrooms and changing rooms', gross: 60000, vatable: true, note: 'Two modest wet-area refreshes; major plumbing or waterproofing can cost more.' },
      { id: 'lighting', name: 'Lighting and minor electrical work', gross: 10000, vatable: true, note: 'Allowance, not a complete electrical replacement.' },
      { id: 'branding', name: 'Reception, signage and branding', gross: 12000, vatable: true, note: 'Keep the existing reception footprint.' },
      { id: 'access', name: 'Automated entry and cameras', gross: 15000, vatable: true, note: 'No-touch entry hardware and setup; software remains in monthly costs.' },
      { id: 'weights', name: 'Additional studio weights', gross: 8000, vatable: true, note: 'Small equipment only; no initial machine replacement.' },
      { id: 'repairs', name: 'Service and repair existing machines', gross: 10000, vatable: true, note: 'Inspect and service the equipment being purchased. Replacement belongs in phase two.' },
    ],
    baselineMonthlyGross: 74200, revenueUplift: 0, retainedAtYearOne: 1, annualRevenueGrowth: 0,
    revenueMode: 'baseline', monthlyChurn: 0.02, newMembersPerMonth: 0,
    cohorts: Array.from({ length: 12 }, (_, i) => ({ id: `legacy-${i + 1}`, name: `Existing members · renewal month ${i + 1}`, members: 26 + (i < 5 ? 1 : 0), monthlyGross: 206, renewalMonth: i + 1, renewalRate: 0.8, prepaid: false })),
    renovationMonths: 1, renovationCollectionShare: 0.9, graceType: 'capitalized',
    phase2Enabled: false, phase2Gross: 150000, phase2Vatable: true, phase2OperatingMonth: 18, phase2GuardCash: true, phase2VatDelay: 2,
  };
}

export function acquisitionAssumptions(base: Assumptions): Assumptions {
  return {
    ...structuredClone(base), acquisition: acquisitionDefaults(), closureMonths: 0, operatingMonths: 60,
    launchMembers: base.currentMembers, loanAPrincipal: 0, loanBPrincipal: 500000, selfFinancing: 0,
    graceMonths: 12, repaymentMonths: 60, otherIncomeGross: 0, oneMonthPassesPerMonth: 0, dayPassesPerMonth: 0,
    boiRate: base.boiRate + base.primeSpread, primeSpread: 0,
    // The old full-rebuild depreciation budget no longer represents these assets.
    monthlyDepreciation: 0,
    operatingCosts: base.operatingCosts.filter(c => c.category !== 'Staff' || c.id === 'hodaya').map(c =>
      c.id === 'hodaya' ? { ...c, monthlyGross: 9000, name: 'Hodaya — total employer cost', note: 'Salaried operations/member-service role; employer costs already included. No additional hourly gym staff.' }
      : c.id === 'studio' ? { ...c, monthlyGross: 14500, note: 'Studio instructors retained. Total monthly business cost; no second payroll loading.' } : c),
  };
}

/** Gross allowances become startup expenses once, with only supported invoice VAT credited. */
export function acquisitionStartupLines(a: Assumptions): StartupCostLine[] {
  const p = a.acquisition!;
  const line = (id: string, name: string, gross: number, vatable: boolean, note: string): StartupCostLine =>
    ({ id, name, exVat: vatable ? gross / (1 + a.vatRate) : gross, vatable, note });
  return [
    line('purchase', 'Purchase existing gym as-is', p.purchaseGross, p.purchaseVatable, 'Gross budget. Purchase VAT is unconfirmed; no credit is assumed by default.'),
    ...p.renovation.map(c => line(c.id, c.name, c.gross, c.vatable, c.note)),
    line('contingency', 'Renovation contingency — assumed spent', p.renovation.reduce((s,c) => s+c.gross, 0) * p.contingencyRate, false, 'Conservatively assumes full spending. No VAT credit until invoiced. Unspent contingency stays in the bank.'),
    line('admin', 'Legal, accounting and membership migration', p.adminGross, true, 'Gross planning allowance.'),
  ];
}

/** Existing-member economics, before disruption and new signups. */
function existingRevenue(a: Assumptions, month: number, targetsEnabled: boolean) {
  const p = a.acquisition!;
  const fee = blendedMembershipFee(a) * Math.pow(1 + a.priceInflation, Math.floor((month - 1) / 12));
  if (p.revenueMode === 'baseline') {
    const retention = 1 + (p.retainedAtYearOne - 1) * Math.min(1, (month - 1) / 11);
    const members = a.currentMembers * retention;
    // Member targets already create sales growth; do not compound a second revenue-growth assumption.
    const annualGrowth = targetsEnabled ? 0 : p.annualRevenueGrowth;
    const collected = p.baselineMonthlyGross * (1 + p.revenueUplift) * retention * Math.pow(1 + annualGrowth, Math.floor((month - 1) / 12));
    return { collected, earned: collected, members };
  }
  let members = 0, collected = 0, earned = 0;
  for (const c of p.cohorts) {
    const renewed = month >= c.renewalMonth;
    const demand = c.members * (renewed ? c.renewalRate * Math.pow(1 - p.monthlyChurn, month - c.renewalMonth) : 1);
    const count = Math.max(0, Math.min(demand, a.capacity - members));
    members += count;
    const income = count * (renewed ? fee : c.monthlyGross);
    earned += income;
    if (renewed || !c.prepaid) collected += income;
  }
  return { collected, earned, members };
}

export function acquisitionRevenue(a: Assumptions, month: number) {
  const p = a.acquisition!;
  if (month === 0) return { collected: 0, earned: 0, members: 0, newMembers: 0, signups: 0, lostNewMembers: 0, targetMembers: 0 };
  const targetsEnabled = acquisitionGrowth(p).enabled;
  const existing = existingRevenue(a, month, targetsEnabled);
  const factor = month <= p.renovationMonths ? p.renovationCollectionShare : 1;
  const fee = blendedMembershipFee(a) * Math.pow(1 + a.priceInflation, Math.floor((month - 1) / 12));
  let newMembers = 0, signups = 0, lostNewMembers = 0;
  if (targetsEnabled) {
    // Add enough sales to reach the NET goal after retention losses and new-member churn.
    // Falling goals never cancel existing memberships; churn can reduce the count naturally.
    for (let m = 1; m <= month; m++) {
      const legacy = existingRevenue(a, m, true);
      lostNewMembers = newMembers * p.monthlyChurn;
      const survivors = Math.min(newMembers - lostNewMembers, Math.max(0, a.capacity - legacy.members));
      signups = Math.max(0, acquisitionMemberTarget(a, m) - legacy.members - survivors);
      newMembers = survivors + signups;
    }
  } else {
    newMembers = p.monthlyChurn === 0 ? p.newMembersPerMonth * month : p.newMembersPerMonth * (1 - Math.pow(1 - p.monthlyChurn, month)) / p.monthlyChurn;
    signups = Math.min(p.newMembersPerMonth, Math.max(0, a.capacity - existing.members - (newMembers - p.newMembersPerMonth)));
  }
  const admittedNew = Math.max(0, Math.min(newMembers, a.capacity - existing.members));
  const existingCapacityShare = targetsEnabled && existing.members > a.capacity ? a.capacity / existing.members : 1;
  return {
    collected: (existing.collected * existingCapacityShare + admittedNew * fee) * factor,
    earned: (existing.earned * existingCapacityShare + admittedNew * fee) * factor,
    members: Math.min(a.capacity, Math.round(existing.members + admittedNew)),
    newMembers: admittedNew, signups, lostNewMembers,
    targetMembers: acquisitionMemberTarget(a, month),
  };
}

export function monthlyBreakEven(a: Assumptions, economicOpex: number, debt = 0, ownerPay = 0) {
  return (economicOpex + debt + ownerPay) * (1 + a.vatRate) / (1 - a.cardFeeRate);
}

/** Steady taxable month: principal repayments use cash but are not a tax deduction. */
export function monthlyBreakEvenAfterTax(a: Assumptions, economicOpex: number, debt: number, interest: number, ownerPay = 0) {
  const deductions = interest + a.monthlyDepreciation;
  const debtAndTax = debt > deductions && a.corporateTaxRate < 1
    ? (debt - a.corporateTaxRate * deductions) / (1 - a.corporateTaxRate) : debt;
  return monthlyBreakEven(a, economicOpex, debtAndTax, ownerPay);
}
