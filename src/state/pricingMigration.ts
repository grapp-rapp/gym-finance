import type { Assumptions } from '../model/types';
const newPricing = { priceStandard: 250, priceSoldier: 175, priceCouple: 450, mixStandard: 0.85, mixSoldier: 0.1, mixCouple: 0.05, priceOneMonth: 350, priceDayPass: 35, oneMonthPassesPerMonth: 0, dayPassesPerMonth: 0 };
/** One-time pricing-only upgrade; finance, growth, salaries and actuals stay intact. */
export function migratePricingPlan<T extends { version: number; assumptions: Assumptions }>(plan: T): T {
  if (plan.version >= 3) return plan;
  const assumptions = { ...plan.assumptions, ...newPricing };
  for (const legacy of ['priceFullAccess', 'priceSingleService', 'mixFullAccess', 'mixSingleService']) delete (assumptions as unknown as Record<string, unknown>)[legacy];
  return { ...plan, version: 3, assumptions };
}
