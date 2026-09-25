import type { ActualEntry } from './types';

/** Missing components are unknown, never implicitly zero. */
export function actualTotals(actual?: ActualEntry) {
  const sum = (keys: (keyof ActualEntry)[]) => {
    const values = keys.map((key) => actual?.[key]);
    return values.every((value) => typeof value === 'number' && Number.isFinite(value))
      ? values.reduce<number>((total, value) => total + (value as number), 0)
      : null;
  };
  return {
    cashIn: sum(['membershipCashIn', 'otherCashIn']),
    cashOut: sum(['operatingCashOut', 'debtPayment', 'corporateTax', 'ownerPayroll']),
  };
}
