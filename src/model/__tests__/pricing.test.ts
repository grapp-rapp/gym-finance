import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { blendedMembershipFee, organicMembersAt } from '../membership';
import { runModel } from '../cashflow';
import { migratePricingPlan } from '../../state/pricingMigration';
const old = { ...a, priceStandard: 230, priceCouple: 400, priceSoldier: 150, mixStandard: 0.85, mixCouple: 0.1, mixSoldier: 0.05 };
const policy = DEFAULT_SCENARIOS[0];
describe('Revised gross membership pricing', () => {
  it('calculates the people-weighted recurring blend, excluding passes', () => {
    expect(blendedMembershipFee(a)).toBe(241.25);
    expect(blendedMembershipFee(old)).toBe(223);
    expect(blendedMembershipFee({ ...a, priceStandard: 300 })).toBe(283.75);
    expect(blendedMembershipFee({ ...a, oneMonthPassesPerMonth: 50, dayPassesPerMonth: 100 })).toBe(241.25);
    const couples = runModel({ ...a, launchMembers: 100, mixStandard: 0, mixSoldier: 0, mixCouple: 1 }, policy).months.find(m => m.operatingMonth === 1)!;
    expect(couples.totalMembers).toBe(100);
    expect(couples.membershipCashIn).toBe(22500);
  });
  it('routes separate pass revenue, with VAT and no extra recurring members', () => {
    const base = runModel(a, policy);
    const passes = runModel({ ...a, oneMonthPassesPerMonth: 2, dayPassesPerMonth: 10 }, policy);
    for (const [i, m] of passes.months.entries()) {
      expect(m.totalMembers).toBe(base.months[i].totalMembers);
      expect(m.membershipCashIn - base.months[i].membershipCashIn).toBe(m.operatingMonth ? 700 : 0);
      expect(m.otherCashIn - base.months[i].otherCashIn).toBe(m.operatingMonth ? 350 : 0);
      expect(m.netRevenueExVat - base.months[i].netRevenueExVat).toBeCloseTo(m.operatingMonth ? 1050 / 1.18 : 0, 6);
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
    }
    expect(250 / (1 + a.vatRate)).toBeCloseTo(211.86440678);
  });
  it('migrates only pricing once, retaining growth, finance, Moatza, salaries and actuals', () => {
    const prior = { version: 2, assumptions: { ...old, selfFinancing: 450000, priceFullAccess: 230 }, scenarios: [{ ...policy, cashTarget: 100000, salaryStep: { enabled: true, operatingMonth: 13, partner1Gross: 6000, partner2Gross: 7000 } }], actuals: [{ timelineMonth: 3, membershipCashIn: 80000 }] };
    const next = migratePricingPlan(prior);
    expect(next.version).toBe(3);
    expect(blendedMembershipFee(next.assumptions)).toBe(241.25);
    expect(next.scenarios).toEqual(prior.scenarios);
    expect(next.actuals).toEqual(prior.actuals);
    for (const key of ['launchMembers','capacity','yearEndTargets','loanAPrincipal','loanBPrincipal','selfFinancing','operatingCosts','vatRate','moatzaFee','moatzaEnabled','otherIncomeGross','sweepShareOfExcess'] as const) expect(next.assumptions[key]).toEqual(prior.assumptions[key]);
    expect('priceFullAccess' in next.assumptions).toBe(false);
    next.assumptions.priceStandard = 260;
    next.assumptions.dayPassesPerMonth = 50;
    expect(migratePricingPlan(next)).toEqual(next);
  });
  it('isolates pricing in the requested before/after report', () => {
    const before = runModel(old, policy), after = runModel(a, policy);
    before.months.forEach((m,i) => {
      expect(after.months[i].totalMembers).toBe(m.totalMembers);
      expect(after.months[i].organicMembers).toBe(m.organicMembers);
    });
    for (let op=1;op<=60;op++) expect(organicMembersAt(old,op)).toBe(organicMembersAt(a,op));
    const membership = (r: typeof before, year: number) => r.months.filter(m => m.operatingYear === year).reduce((sum,m) => sum + m.membershipCashIn,0);
    const rows = [
      { metric:'Blended monthly membership price', before:blendedMembershipFee(old), after:blendedMembershipFee(a) },
      ...[1,2,3,4,5].map(year => ({ metric:`Year ${year} membership cash collected`, before:membership(before,year), after:membership(after,year) })),
      { metric:'Year 1 ending cash', before:before.years[0].endingCash, after:after.years[0].endingCash },
      { metric:'Debt-free operating month', before:before.debtFreeOperatingMonth, after:after.debtFreeOperatingMonth },
      { metric:'Year 5 ending cash', before:before.years[4].endingCash, after:after.years[4].endingCash },
    ];
    const summaries = DEFAULT_SCENARIOS.map(s => { const b=runModel(old,s), n=runModel(a,s); return {scenario:s.name, before:{year1:b.years[0].endingCash,debtFree:b.debtFreeOperatingMonth,year5:b.years[4].endingCash},after:{year1:n.years[0].endingCash,debtFree:n.debtFreeOperatingMonth,year5:n.years[4].endingCash}}; });
    writeFileSync('PRICING_COMPARISON.json',JSON.stringify({basis:'Default Debt-Max scenario, 360 launch members, unchanged growth, funding, salaries, Moatza OFF, 100000 target, zero pass sales; previous app pricing 230/200/150 with 85/10/5 mix.',rows,summaries},null,2));
    console.log(JSON.stringify(rows));
  });
});
