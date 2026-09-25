import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS as a, DEFAULT_SCENARIOS } from '../assumptions';
import { startupTotals } from '../costs';
import { runModel } from '../cashflow';
import { migrateReservePlan } from '../../state/reserveMigration';
describe('Reserve remains bank cash', () => {
  const reserve = { id: 'run-in', name: 'Reserve', exVat: 75000, vatable: false, note: '' };
  it('never deducts a legacy reserve or refunds VAT on it', () => {
    expect(startupTotals({ ...a, startupCosts: [...a.startupCosts, reserve] })).toEqual(startupTotals(a));
    expect(startupTotals(a).cashHeadroom).toBeCloseTo(143990, 2);
    expect(startupTotals(a).reclaimableVat).toBeCloseTo(151933.7286, 2);
  });
  it('upgrades existing targets once, preserving custom data and subsequent edits', () => {
    const old = { version: 1, assumptions: { ...a, selfFinancing: 123000, startupCosts: [...a.startupCosts, reserve] }, scenarios: [{ ...DEFAULT_SCENARIOS[0], cashTarget: 150000, partner2PostDebtSalary: 7000 }], actuals: [{ timelineMonth: 3, endingCash: 40000 }] };
    const next = migrateReservePlan(old);
    expect(next.assumptions.selfFinancing).toBe(123000);
    expect(next.actuals).toEqual(old.actuals);
    expect(next.scenarios[0].cashTarget).toBe(100000);
    expect(next.scenarios[0].partner2PostDebtSalary).toBe(7000);
    expect(next.assumptions.startupCosts.some(c => c.id === 'run-in')).toBe(false);
    next.scenarios[0].cashTarget = 110000;
    expect(migrateReservePlan(next).scenarios[0].cashTarget).toBe(110000);
  });
  it('treats the target as a sweep threshold, never an upfront expense', () => {
    const low = runModel({ ...a, sweepsEnabled: false }, { ...DEFAULT_SCENARIOS[0], cashTarget: 100000 });
    const high = runModel({ ...a, sweepsEnabled: false }, { ...DEFAULT_SCENARIOS[0], cashTarget: 150000 });
    expect(low.months.map(m => m.endingCash)).toEqual(high.months.map(m => m.endingCash));
    for (const m of runModel(a, DEFAULT_SCENARIOS[0]).months) {
      if (m.extraDebtPayment > 0) expect(m.endingCash).toBeGreaterThanOrEqual(100000 - 0.01);
      expect(m.openingCash + m.totalCashIn - m.totalCashOut).toBeCloseTo(m.endingCash, 6);
    }
    console.log('Corrected defaults:', { funding: startupTotals(a).totalFinancing, startupSpending: startupTotals(a).grossCash, openingCash: startupTotals(a).cashHeadroom, firstOperatingMonthCash: low.months.find(m => m.operatingMonth === 1)?.endingCash });
  });
});
