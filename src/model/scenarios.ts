import { runModel } from './cashflow';
import type { Assumptions, ScenarioPolicy, ScenarioResult } from './types';

/** Run several owner-pay policies against the same assumptions. */
export function runScenarios(a: Assumptions, policies: ScenarioPolicy[]): ScenarioResult[] {
  return policies.map((policy) => runModel(a, policy));
}

/** Copy a scenario so the user can edit it without touching a built-in default. */
export function duplicateScenario(policy: ScenarioPolicy, existingIds: string[]): ScenarioPolicy {
  let suffix = 2;
  let id = `${policy.id}-copy`;
  while (existingIds.includes(id)) {
    id = `${policy.id}-copy-${suffix}`;
    suffix += 1;
  }
  return {
    ...policy,
    id,
    name: `${policy.name.replace(/^[A-Z] — /, '')} (copy)`,
    builtIn: false,
  };
}

export type HealthLevel = 'healthy' | 'tight' | 'danger';

/**
 * Traffic-light rating for a scenario's liquidity.
 *   danger  — cash goes negative at some point after reopening
 *   tight   — the plan never fully recovers to the cash target, or dips far below it
 *   healthy — everything else
 */
export function liquidityHealth(result: ScenarioResult): HealthLevel {
  if (result.minCashAfterReopening < 0) return 'danger';
  if (result.minCashAfterReopening < result.policy.cashTarget * 0.5) return 'tight';
  return 'healthy';
}

/** Plain-English explanation of a month whose cash fell for a deliberate reason. */
export function explainNetCashChange(
  month: { netCashChange: number; extraDebtPayment: number; operatingMonth: number },
  formatCurrency: (value: number) => string,
): string | null {
  if (month.netCashChange >= 0) return null;
  if (month.extraDebtPayment > 0) {
    return `Cash decreased this month because ${formatCurrency(
      month.extraDebtPayment,
    )} was intentionally sent to debt.`;
  }
  if (month.operatingMonth === 0) {
    return 'Cash decreased because the gym is closed for the rebuild and no memberships are being collected.';
  }
  return 'Cash decreased this month: cash out exceeded cash collected.';
}
