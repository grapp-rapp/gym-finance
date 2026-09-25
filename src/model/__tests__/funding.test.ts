import { describe, it, expect } from 'vitest';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { runModel } from '../cashflow';
import { organicMembersAt } from '../membership';
import { startupTotals } from '../costs';
import { actualTotals } from '../actuals';

const policy = DEFAULT_SCENARIOS[0];
describe('Owner funding and launch update', () => {
  it('starts at 360, reaches the year-one target and respects capacity', () => {
    expect(organicMembersAt(a, 1)).toBe(360);
    expect(organicMembersAt(a, 12)).toBe(450);
    expect(organicMembersAt({ ...a, capacity: 300 }, 1)).toBe(300);
  });
  it('supports full self-financing without debt, interest or repayments', () => {
    const inputs = { ...a, selfFinancing: 1500000, loanAPrincipal: 0, loanBPrincipal: 0 };
    const result = runModel(inputs, policy);
    expect(startupTotals(inputs).totalFinancing).toBe(1500000);
    expect(result.months[0].openingCash).toBeCloseTo(1500000 - startupTotals(inputs).grossCash);
    for (const m of result.months) {
      expect(m.debtRemaining + m.regularDebtPayment + m.extraDebtPayment + m.loanBInterest).toBe(0);
      expect(m.events).not.toContain('DEBT START');
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
    }
    expect(result.months.find(m => m.operatingMonth === 1)?.partner1Gross).toBe(policy.postDebtSalary);
  });
  it('counts mixed owner funding once without treating equity as income', () => {
    const baseline = runModel({ ...a, sweepsEnabled: false }, policy);
    const mixed = runModel({ ...a, sweepsEnabled: false, selfFinancing: 500000 }, policy);
    mixed.months.forEach((m, i) => {
      expect(m.endingCash - baseline.months[i].endingCash).toBeCloseTo(500000, 6);
      expect(m.totalCashIn).toBe(baseline.months[i].totalCashIn);
      expect(m.corporateTax).toBe(baseline.months[i].corporateTax);
    });
  });
  it('keeps incomplete actuals unknown and accepts explicitly recorded zero', () => {
    expect(actualTotals()).toEqual({ cashIn: null, cashOut: null });
    expect(actualTotals({ timelineMonth: 3, membershipCashIn: 100, operatingCashOut: 50 })).toEqual({ cashIn: null, cashOut: null });
    expect(actualTotals({ timelineMonth: 3, membershipCashIn: 100, otherCashIn: 0, operatingCashOut: 50, debtPayment: 0, corporateTax: 0, ownerPayroll: 0 })).toEqual({ cashIn: 100, cashOut: 50 });
  });
});
