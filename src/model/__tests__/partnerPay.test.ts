import { describe, expect, it } from 'vitest';
import { ownerPayFor } from '../ownerPay';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { runModel } from '../cashflow';
import { duplicateScenario } from '../scenarios';
const policy = { ...DEFAULT_SCENARIOS[1], preDebtStartMonth: 1, preDebtSalary: 4000, partner2PreDebtSalary: 7000, postDebtSalary: 9000, partner2PostDebtSalary: 13000 };
const input = { policy, isOperating: true, operatingMonth: 1, previousDebtRemaining: 100000, employerLoad: 0.2, isFundingMonth: false };
describe('Independent partner salaries', () => {
  it('sums unequal gross salaries and employer costs', () => {
    expect(ownerPayFor(input)).toEqual({ partner1Gross: 4000, partner2Gross: 7000, employerCosts: 2200, totalPayrollCost: 13200 });
    expect(ownerPayFor({ ...input, previousDebtRemaining: 0 })).toEqual({ partner1Gross: 9000, partner2Gross: 13000, employerCosts: 4400, totalPayrollCost: 26400 });
  });
  it('preserves legacy equal pay and respects closure and start timing', () => {
    const legacy = { ...DEFAULT_SCENARIOS[1], preDebtStartMonth: 1 };
    expect(ownerPayFor({ ...input, policy: legacy }).partner2Gross).toBe(legacy.preDebtSalary);
    expect(ownerPayFor({ ...input, isOperating: false }).totalPayrollCost).toBe(0);
    expect(ownerPayFor({ ...input, operatingMonth: 0 }).totalPayrollCost).toBe(0);
  });
  it('detects salary start when only partner 2 is paid and reconciles cash and tax', () => {
    const secondOnly = { ...policy, preDebtSalary: 0, postDebtSalary: 0, partner2PreDebtSalary: 7000, partner2PostDebtSalary: 7000 };
    const result = runModel(a, secondOnly);
    expect(result.salaryStartOperatingMonth).toBe(1);
    expect(result.months.filter(m => m.events.includes('SALARY START'))).toHaveLength(1);
    for (const m of result.months) {
      expect(m.partner1Gross).toBe(0);
      expect(m.ownerPayrollTotal).toBeCloseTo((m.partner1Gross + m.partner2Gross) * 1.2);
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
    }
    const equalCombined = runModel(a, { ...secondOnly, preDebtSalary: 3500, partner2PreDebtSalary: 3500, postDebtSalary: 3500, partner2PostDebtSalary: 3500 });
    result.months.forEach((m, i) => expect(m.corporateTax).toBe(equalCombined.months[i].corporateTax));
    expect(duplicateScenario(policy, [policy.id]).partner2PostDebtSalary).toBe(13000);
    expect(JSON.parse(JSON.stringify(policy)).partner2PreDebtSalary).toBe(7000);
  });
  it('uses independent post-debt pay immediately when fully self-financed', () => {
    const result = runModel({ ...a, loanAPrincipal: 0, loanBPrincipal: 0, selfFinancing: 1500000 }, policy);
    const launch = result.months.find(m => m.operatingMonth === 1)!;
    expect(launch.partner1Gross).toBe(9000);
    expect(launch.partner2Gross).toBe(13000);
  });
});
