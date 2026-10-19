import { describe, expect, it } from 'vitest';
import { ACQUISITION_POLICY, acquisitionAssumptions, DEFAULT_ASSUMPTIONS, equipmentAllocation, equipmentBudgetCase, reinvestmentAssumptions, runModel } from '..';
import { decodeState, defaultState } from '../../state/persistence';
import { validPlan } from '../../../server/validation.mjs';

describe('reinvest in both gyms before voluntary debt payments', () => {
  it('pauses sweeps and funds the 200k combined budget without changing regular debt payments', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS), r = runModel(a, ACQUISITION_POLICY);
    expect(a.sweepsEnabled).toBe(false);
    expect(equipmentAllocation(a.acquisition!)).toEqual({ menGross: 100000, womenGross: 100000 });
    expect(a.acquisition!.phase2Enabled).toBe(true);
    expect(r.months.every(m => m.extraDebtPayment === 0)).toBe(true);
    expect(r.months[13].regularDebtPayment).toBeCloseTo(9833.76, 2);
    expect(r.years.at(-1)!.debtRemaining).toBeGreaterThan(100000);
    a.operatingMonths = 72;
    expect(runModel(a, ACQUISITION_POLICY).debtFreeOperatingMonth).toBe(72);
  });
  it('compares alternatives without inventing extra funding or equipment-driven growth', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS), original = structuredClone(a);
    const small = equipmentBudgetCase(a, ACQUISITION_POLICY, 200000);
    const full = equipmentBudgetCase(a, ACQUISITION_POLICY, 500000);
    expect(small.purchaseMonth).toBe(14); expect(full.purchaseMonth).toBe(27);
    expect(small.extraUpfrontCash).toBe(195000); expect(full.extraUpfrontCash).toBe(495000);
    expect(small.projectGross).toBe(595000); expect(full.projectGross).toBe(895000);
    expect(full.allocation).toEqual({ menGross: 250000, womenGross: 250000 });
    expect(full.assumptions.loanBPrincipal).toBe(500000);
    expect(full.assumptions.selfFinancing).toBe(0);
    expect(full.result.years.map(y => y.endMembers)).toEqual(small.result.years.map(y => y.endMembers));
    expect(full.result.years.map(y => y.grossBillings)).toEqual(small.result.years.map(y => y.grossBillings));
    expect(a).toEqual(original);
    for (const c of [small, full]) {
      const buys = c.result.months.filter(m => (m.capitalSpending ?? 0) > 0);
      expect(buys).toHaveLength(1); expect(buys[0].capitalSpending).toBe(c.gross);
      expect(c.result.minCashFullTimeline).toBeGreaterThanOrEqual(100000);
      expect(c.result.months[c.purchaseMonth! + 2].startupVatRefund).toBeCloseTo(c.gross * 18 / 118, 6);
      for (const m of c.result.months) expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
    }
  });
  it('allows an uneven allocation without spending the combined budget twice', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS), before = runModel(a, ACQUISITION_POLICY);
    a.acquisition!.phase2MenGross = 70000;
    expect(equipmentAllocation(a.acquisition!)).toEqual({ menGross: 70000, womenGross: 130000 });
    expect(runModel(a, ACQUISITION_POLICY)).toEqual(before);
    expect(validPlan({ ...defaultState(), assumptions: a })).toBe(true);
    a.acquisition!.phase2MenGross = 250000;
    expect(validPlan({ ...defaultState(), assumptions: a })).toBe(false);
  });
  it('applies the new policy to an older acquisition save once and preserves other model data', () => {
    const old = defaultState(); delete old.assumptions.acquisition!.capitalPolicyVersion;
    old.assumptions.sweepsEnabled = true; old.assumptions.acquisition!.phase2Enabled = false;
    old.assumptions.acquisition!.phase2Gross = 150000;
    old.actuals = [{ timelineMonth: 3, endingCash: 120000, note: 'Bank actual' }];
    const before = structuredClone(old), next = decodeState(old);
    expect(next.assumptions.sweepsEnabled).toBe(false);
    expect(next.assumptions.acquisition!.phase2Gross).toBe(200000);
    expect(next.actuals).toEqual(before.actuals); expect(next.scenarios).toEqual(before.scenarios);
    expect(next.assumptions.operatingCosts).toEqual(before.assumptions.operatingCosts);
    expect(next.assumptions.acquisition!.growth).toEqual(before.assumptions.acquisition!.growth);
    expect(next.assumptions.loanBPrincipal).toBe(before.assumptions.loanBPrincipal);
    expect(next.assumptions.vatRate).toBe(before.assumptions.vatRate);
    expect(old).toEqual(before);
    next.assumptions.sweepsEnabled = true;
    next.assumptions.acquisition!.phase2Gross = 500000;
    next.assumptions.acquisition!.phase2MenGross = 250000;
    expect(decodeState(next)).toEqual(next);
    expect(reinvestmentAssumptions(DEFAULT_ASSUMPTIONS)).toBe(DEFAULT_ASSUMPTIONS);
  });
});
