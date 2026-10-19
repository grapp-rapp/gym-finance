import { describe, expect, it } from 'vitest';
import { acquisitionAssumptions, acquisitionDisruption, acquisitionRevenue, ACQUISITION_POLICY, DEFAULT_ASSUMPTIONS, runModel } from '..';
import { defaultState, decodeState } from '../../state/persistence';
import { validPlan } from '../../../server/validation.mjs';

describe('brief renovation closure', () => {
  it('keeps recurring collections, member growth and running costs during two closure days', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    expect(acquisitionDisruption(a.acquisition!)).toEqual({ closureDays: 2, months: 1, collectionShare: 1 });
    expect(acquisitionRevenue(a, 1).collected).toBe(74200);
    const before = runModel(a, ACQUISITION_POLICY);
    a.acquisition!.renovationClosureDays = 0;
    expect(runModel(a, ACQUISITION_POLICY)).toEqual(before);
    expect(before.months[1].coreOpexExVat).toBe(before.months[2].coreOpexExVat);
    expect(before.months[1].endingCash).toBeGreaterThan(100000);
  });
  it('applies only the explicitly chosen collection loss for the chosen months', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS), full = structuredClone(a);
    a.acquisition!.renovationCollectionShare = .95;
    a.acquisition!.renovationMonths = 2;
    for (const month of [1, 2]) {
      expect(acquisitionRevenue(a, month).collected).toBeCloseTo(acquisitionRevenue(full, month).collected * .95, 7);
      expect(acquisitionRevenue(a, month).members).toBe(acquisitionRevenue(full, month).members);
    }
    expect(acquisitionRevenue(a, 3)).toEqual(acquisitionRevenue(full, 3));
    const result = runModel(a, ACQUISITION_POLICY);
    for (const m of result.months) expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
  });
  it('replaces the old stock haircut on existing saves, while retaining customized disruption', () => {
    const state = defaultState(), p = state.assumptions.acquisition!;
    delete p.renovationClosureDays;
    p.renovationCollectionShare = .9;
    const old = structuredClone(state);
    expect(acquisitionRevenue(decodeState(state).assumptions, 1).collected).toBe(74200);
    expect(state).toEqual(old);
    p.renovationCollectionShare = .8;
    expect(acquisitionRevenue(state.assumptions, 1).collected).toBe(74200 * .8);
    p.renovationCollectionShare = .9; p.renovationClosureDays = 2;
    expect(acquisitionRevenue(state.assumptions, 1).collected).toBe(74200 * .9);
    expect(validPlan(JSON.parse(JSON.stringify(state)))).toBe(true);
    p.renovationClosureDays = -1;
    expect(validPlan(state)).toBe(false);
  });
});
