import { describe, expect, it } from 'vitest';
import { acquisitionAssumptions, acquisitionRevenue, ACQUISITION_POLICY, DEFAULT_ASSUMPTIONS, duplicateScenario, runModel } from '..';
import { defaultState, decodeState } from '../../state/persistence';
import { validPlan } from '../../../server/validation.mjs';

describe('Moatza and salary options in the equipment-first plan', () => {
  it('adds Moatza cash from its start month and preserves the existing combined-capacity rule', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    a.moatzaEnabled = true; a.moatzaMembers = 300; a.moatzaFee = 190; a.moatzaStartMonth = 8;
    const r = runModel(a, ACQUISITION_POLICY);
    expect(r.months[7].moatzaMembers).toBe(0);
    expect(r.months[8].moatzaMembers).toBe(300);
    expect(r.months[8].membershipCashIn).toBeCloseTo(acquisitionRevenue(a, 8).collected + 57000, 6);
    expect(r.months[8].totalMembers).toBe(acquisitionRevenue(a, 8).members + 300);
    const capped = r.months[36], organic = acquisitionRevenue(a, 36);
    expect(capped.organicBilled).toBe(550); expect(capped.totalMembers).toBe(850);
    expect(capped.membershipCashIn).toBeCloseTo(organic.collected * 550 / organic.members + 57000, 6);
    a.moatzaEnabled = false;
    expect(runModel(a, ACQUISITION_POLICY).months[36].membershipCashIn).toBeCloseTo(organic.collected, 6);
  });
  it('pays independent salaries and a scheduled raise while scheduled loan payments continue', () => {
    const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
    const policy = { ...duplicateScenario(ACQUISITION_POLICY, [ACQUISITION_POLICY.id]), preDebtStartMonth: 13, preDebtSalary: 4000, partner2PreDebtSalary: 6000, salaryStep: { enabled: true, operatingMonth: 25, partner1Gross: 6000, partner2Gross: 8000 } };
    const paid = runModel(a, policy), unpaid = runModel(a, ACQUISITION_POLICY);
    expect(paid.months[12].ownerPayrollTotal).toBe(0);
    expect(paid.months[13].partner1Gross).toBe(4000); expect(paid.months[13].partner2Gross).toBe(6000);
    expect(paid.months[13].ownerPayrollTotal).toBe(12000);
    expect(paid.months[25].ownerPayrollTotal).toBe(16800);
    expect(paid.months[13].regularDebtPayment).toBe(unpaid.months[13].regularDebtPayment);
    expect(paid.months.every(m => m.extraDebtPayment === 0)).toBe(true);
    const equipmentMonth = paid.months.find(m => (m.capitalSpending ?? 0) > 0)?.operatingMonth ?? Infinity;
    expect(equipmentMonth).toBeGreaterThan(unpaid.months.find(m => (m.capitalSpending ?? 0) > 0)!.operatingMonth);
    expect(ACQUISITION_POLICY.preDebtSalary).toBe(0);
    for (const m of paid.months) expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
  });
  it('saves both options together without enabling sweeps or changing equipment budgets', () => {
    const s = defaultState(); s.assumptions.moatzaEnabled = true;
    const custom = { ...duplicateScenario(s.scenarios[0], s.scenarios.map(p => p.id)), preDebtStartMonth: 13, preDebtSalary: 5000, partner2PreDebtSalary: 7000 };
    s.scenarios.push(custom); s.selectedScenarioId = custom.id;
    const restored = decodeState(JSON.parse(JSON.stringify(s)));
    expect(restored).toEqual(s); expect(validPlan(restored)).toBe(true);
    expect(restored.assumptions.sweepsEnabled).toBe(false);
    expect(restored.assumptions.acquisition!.phase2Gross).toBe(200000);
    const r = runModel(restored.assumptions, custom);
    expect(r.months[13].ownerPayrollTotal).toBe(14400);
    expect(r.months[13].moatzaMembers).toBe(restored.assumptions.moatzaMembers);
    for (const m of r.months) expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
  });
});
