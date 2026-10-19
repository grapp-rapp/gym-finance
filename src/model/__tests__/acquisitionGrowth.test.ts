import { describe, expect, it } from 'vitest';
import { ACQUISITION_POLICY, acquisitionAssumptions, acquisitionGrowth, acquisitionRevenue, blendedMembershipFee, DEFAULT_ASSUMPTIONS, runModel } from '..';
import { defaultState, decodeState } from '../../state/persistence';
import { validPlan } from '../../../server/validation.mjs';

describe('acquisition membership growth', () => {
  it('starts at takeover membership, pushes to 450 in year one and moderates later growth', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    expect(acquisitionRevenue(a, 1).members).toBe(317);
    expect([12, 24, 36, 48, 60].map(m => acquisitionRevenue(a, m).members)).toEqual([450, 550, 650, 725, 800]);
    expect(acquisitionRevenue(a, 2).members).toBe(329);
    expect(acquisitionRevenue(a, 13).members).toBe(458);
    expect(acquisitionRevenue(a, 12).collected).toBeCloseTo(74200 + 133 * blendedMembershipFee(a), 6);
    expect(acquisitionRevenue(a, 1).collected).toBeCloseTo(74200, 6);
    expect(DEFAULT_ASSUMPTIONS.yearEndTargets).toEqual([450, 600, 725, 800, 850]);
  });
  it('calculates replacement sales after churn without selling the same growth twice', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    const stock = acquisitionRevenue(a, 11), next = acquisitionRevenue(a, 12);
    expect(next.lostNewMembers).toBeCloseTo(stock.newMembers * .02, 8);
    expect(next.signups).toBeCloseTo(next.newMembers - stock.newMembers * .98, 8);
    expect(next.signups).toBeGreaterThan(next.members - stock.members);
    const before = runModel(a, ACQUISITION_POLICY);
    a.acquisition!.newMembersPerMonth = 100;
    a.acquisition!.annualRevenueGrowth = .5;
    expect(runModel(a, ACQUISITION_POLICY)).toEqual(before);
  });
  it('requires extra signups when existing retention falls; keeps historical collections and public prices distinct', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    a.acquisition!.retainedAtYearOne = .8;
    const m = acquisitionRevenue(a, 12);
    expect(m.members).toBe(450);
    expect(m.newMembers).toBeCloseTo(450 - 317 * .8, 8);
    expect(m.collected).toBeCloseTo(74200 * .8 + m.newMembers * blendedMembershipFee(a), 6);
  });
  it('respects capacity, handles 100% churn and never cancels people to meet a lower goal', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    a.capacity = 400; a.acquisition!.monthlyChurn = 1;
    const m = acquisitionRevenue(a, 24);
    expect(m.members).toBe(400); expect(m.newMembers).toBe(83); expect(m.signups).toBe(83);
    a.acquisition!.growth!.yearEndTargets = [200, 200, 200, 200, 200];
    expect(acquisitionRevenue(a, 12).members).toBe(317);
    expect(acquisitionRevenue(a, 12).signups).toBe(0);
    a.capacity = 200;
    expect(acquisitionRevenue(a, 1).collected).toBeCloseTo(74200 * 200 / 317, 6);
  });
  it('replaces expiring prepaid cohorts without collecting their prepaid fees again', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    a.currentMembers = 100; a.acquisition!.renovationMonths = 0;
    a.acquisition!.growth!.yearEndTargets = [100, 100, 100, 100, 100];
    a.acquisition!.revenueMode = 'cohorts';
    a.acquisition!.cohorts = [{ id: 'prepaid', name: 'Existing', members: 100, monthlyGross: 206, renewalMonth: 4, renewalRate: .8, prepaid: true }];
    expect(acquisitionRevenue(a, 3).collected).toBe(0);
    const m = acquisitionRevenue(a, 4);
    expect(m.members).toBe(100); expect(m.signups).toBe(20);
    expect(m.collected).toBeCloseTo(100 * blendedMembershipFee(a), 7);
  });
  it('updates every cash-flow year, VAT and the bank while leaving funding, costs and salary policy intact', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS), flat = structuredClone(a);
    flat.acquisition!.growth!.enabled = false;
    const growth = runModel(a, ACQUISITION_POLICY), downside = runModel(flat, ACQUISITION_POLICY);
    expect(growth.months[0]).toEqual(downside.months[0]);
    expect(growth.months[13].regularDebtPayment).toBe(downside.months[13].regularDebtPayment);
    expect(growth.years.every((y, i) => y.grossBillings > downside.years[i].grossBillings)).toBe(true);
    for (const m of growth.months) {
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
      expect(m.vatCollected).toBeCloseTo((m.membershipCashIn + m.otherCashIn) * 18 / 118, 6);
      expect(m.ownerPayrollTotal).toBe(0);
    }
    expect(a.operatingCosts).toEqual(flat.operatingCosts);
    expect(growth.year5EndingCash).toBeGreaterThan(downside.year5EndingCash);
  });
  it('loads older flat acquisition saves with recommended growth without overwriting customized manual settings', () => {
    const state = defaultState(); delete state.assumptions.acquisition!.growth;
    const original = structuredClone(state);
    expect(acquisitionGrowth(state.assumptions.acquisition!).enabled).toBe(true);
    expect(acquisitionRevenue(decodeState(state).assumptions, 12).members).toBe(450);
    expect(state).toEqual(original);
    expect(validPlan(state)).toBe(true);
    state.assumptions.acquisition!.newMembersPerMonth = 5;
    expect(acquisitionGrowth(state.assumptions.acquisition!).enabled).toBe(false);
    const custom = acquisitionRevenue(state.assumptions, 12);
    expect(custom.members).toBeLessThan(450);
    state.assumptions.acquisition!.growth = { enabled: true, yearEndTargets: [425, 500, 600, 650, 700] };
    const roundTrip = decodeState(JSON.parse(JSON.stringify(state)));
    expect(acquisitionRevenue(roundTrip.assumptions, 12).members).toBe(425);
    expect(validPlan(roundTrip)).toBe(true);
  });
  it('rejects malformed saved growth targets but accepts deliberate no-growth settings', () => {
    const state = defaultState();
    state.assumptions.acquisition!.growth!.yearEndTargets[0] = -1;
    expect(validPlan(state)).toBe(false);
    state.assumptions.acquisition!.growth = { enabled: false, yearEndTargets: [0, 0, 0, 0, 0] };
    expect(validPlan(state)).toBe(true);
    expect(acquisitionRevenue(state.assumptions, 24).collected).toBe(74200);
  });
});
