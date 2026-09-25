import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { ownerPayFor } from '../ownerPay';
import { runModel } from '../cashflow';
import { duplicateScenario } from '../scenarios';
const policy = { ...DEFAULT_SCENARIOS[1], preDebtStartMonth: 1, preDebtSalary: 3000, partner2PreDebtSalary: 4000, postDebtSalary: 11000, partner2PostDebtSalary: 12000, salaryStep: { enabled: true, operatingMonth: 13, partner1Gross: 7000, partner2Gross: 8000 } };
const input = { policy, isOperating: true, operatingMonth: 12, previousDebtRemaining: 100000, employerLoad: 0.2, isFundingMonth: false };
describe('Scheduled pre-debt salary increase', () => {
  it('changes separate amounts at month 13, including employer costs', () => {
    expect(ownerPayFor(input).totalPayrollCost).toBe(8400);
    expect(ownerPayFor({ ...input, operatingMonth: 13 })).toEqual({ partner1Gross: 7000, partner2Gross: 8000, employerCosts: 3000, totalPayrollCost: 18000 });
    expect(ownerPayFor({ ...input, operatingMonth: 30 }).totalPayrollCost).toBe(18000);
  });
  it('honors closure, salary start, disabled setting and debt-free precedence', () => {
    expect(ownerPayFor({ ...input, operatingMonth: 13, isOperating: false }).totalPayrollCost).toBe(0);
    expect(ownerPayFor({ ...input, operatingMonth: 13, policy: { ...policy, preDebtStartMonth: 20 } }).totalPayrollCost).toBe(0);
    expect(ownerPayFor({ ...input, operatingMonth: 13, policy: { ...policy, salaryStep: { ...policy.salaryStep, enabled: false } } }).totalPayrollCost).toBe(8400);
    expect(ownerPayFor({ ...input, operatingMonth: 13, previousDebtRemaining: 0 }).totalPayrollCost).toBe(27600);
  });
  it('flows into cash and tax forecasts and survives copies and serialization', () => {
    const result = runModel({ ...a, sweepsEnabled: false }, policy);
    const samePay = runModel({ ...a, sweepsEnabled: false }, { ...policy, salaryStep: { ...policy.salaryStep, partner1Gross: 7500, partner2Gross: 7500 } });
    expect(result.months.find(m => m.operatingMonth === 12)?.partner1Gross).toBe(3000);
    expect(result.months.find(m => m.operatingMonth === 13)?.partner1Gross).toBe(7000);
    for (const [i, m] of result.months.entries()) {
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
      expect(m.corporateTax).toBe(samePay.months[i].corporateTax);
    }
    const withoutRaise = runModel({ ...a, sweepsEnabled: false }, { ...policy, salaryStep: undefined });
    expect(result.months.find(m => m.operatingMonth === 13)!.endingCash).toBeLessThan(withoutRaise.months.find(m => m.operatingMonth === 13)!.endingCash);
    expect(duplicateScenario(policy, [policy.id]).salaryStep).toEqual(policy.salaryStep);
    expect(JSON.parse(JSON.stringify(policy)).salaryStep).toEqual(policy.salaryStep);
  });
});
