import type { ActualEntry } from './types';

/** Missing components are unknown, never implicitly zero. */
export function actualTotals(actual?: ActualEntry, options: { capitalRequired?: boolean; vatRefundRequired?: boolean } = {}) {
  const sum = (keys: (keyof ActualEntry)[]) => {
    const values = keys.map((key) => actual?.[key]);
    return values.every((value) => typeof value === 'number' && Number.isFinite(value))
      ? values.reduce<number>((total, value) => total + (value as number), 0)
      : null;
  };
  return {
    cashIn: sum(['membershipCashIn', 'otherCashIn', ...(options.vatRefundRequired || actual?.capitalVatRefund !== undefined ? ['capitalVatRefund' as const] : [])]),
    cashOut: sum(['operatingCashOut', 'debtPayment', 'corporateTax', 'ownerPayroll', ...(options.capitalRequired || actual?.capitalSpending !== undefined ? ['capitalSpending' as const] : [])]),
  };
}
