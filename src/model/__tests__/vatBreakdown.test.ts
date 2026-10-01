import { describe, it, expect } from 'vitest';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { runModel } from '../cashflow';
import { operatingCostTotals } from '../costs';
describe('Explicit operating VAT breakdown', () => {
  it('reconciles gross costs and settlement without changing the cash bridge', () => {
    for (const m of runModel(a, DEFAULT_SCENARIOS[0]).months) {
      expect(m.netOperatingVat).toBeCloseTo(m.vatCollected - m.expenseVatCredits, 6);
      expect(m.operatingGrossCashOut + m.netOperatingVat).toBeCloseTo(m.operatingCashOut, 6);
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
      if (m.operatingMonth) {
        expect(m.vatCollected).toBeCloseTo((m.membershipCashIn + m.otherCashIn) * 18 / 118, 6);
        expect(m.expenseVatCredits).toBeCloseTo(operatingCostTotals(a).monthlyVat + (m.membershipCashIn + m.otherCashIn) * a.cardFeeRate * 18 / 118, 6);
      } else expect(m.expenseVatCredits).toBe(0);
    }
  });
  it('shows a credit surplus as a refund and includes it exactly once', () => {
    const inputs = { ...a, launchMembers: 0, yearEndTargets: [0,0,0,0,0] as [number,number,number,number,number], otherIncomeGross: 0 };
    const m = runModel(inputs, DEFAULT_SCENARIOS[0]).months.find(m => m.operatingMonth === 1)!;
    expect(m.vatCollected).toBe(0);
    expect(m.netOperatingVat).toBeLessThan(0);
    expect(m.netOperatingVat).toBeCloseTo(-operatingCostTotals(a).monthlyVat,6);
    expect(m.operatingGrossCashOut).toBeCloseTo(operatingCostTotals(a).monthlyGross,6);
    expect(m.operatingCashOut).toBeCloseTo(operatingCostTotals(a).monthlyExVat,6);
  });
});
