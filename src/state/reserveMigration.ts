import type { Assumptions, ScenarioPolicy } from '../model/types';
/** Upgrade once, retaining balances, salaries, actuals and other saved settings. */
export function migrateReservePlan<T extends { version: number; assumptions: Assumptions; scenarios: ScenarioPolicy[] }>(plan: T): T {
  if (plan.version >= 2) return plan;
  return {
    ...plan,
    version: 2,
    assumptions: { ...plan.assumptions, startupCosts: plan.assumptions.startupCosts.filter(c => c.id !== 'run-in') },
    scenarios: plan.scenarios.map(s => ({ ...s, cashTarget: 100000 })),
  };
}
