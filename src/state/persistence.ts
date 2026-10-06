import { DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIOS, type ActualEntry, type Assumptions, type ScenarioPolicy } from '../model';
import { migratePricingPlan } from './pricingMigration';
import { migrateReservePlan } from './reserveMigration';

export const LEGACY_STORAGE_KEY = 'shaar-binyamin-gym-model/v1';
export type PlanMode = 'plan' | 'actual';
export interface PersistedState {
  version: number;
  assumptions: Assumptions;
  scenarios: ScenarioPolicy[];
  selectedScenarioId: string;
  actuals: ActualEntry[];
  anchorMonth: string;
  mode: PlanMode;
}
export function defaultState(): PersistedState {
  return { version: 3, assumptions: DEFAULT_ASSUMPTIONS, scenarios: DEFAULT_SCENARIOS, selectedScenarioId: 'A', actuals: [], anchorMonth: '2026-09', mode: 'plan' };
}
export function decodeState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved model');
  const parsed = value as Partial<PersistedState>;
  if (![1, 2, 3].includes(parsed.version ?? 0) || !parsed.assumptions || !Array.isArray(parsed.scenarios) || !parsed.scenarios.length || !Array.isArray(parsed.actuals)) throw new Error('Unsupported saved model');
  const base = defaultState();
  return migratePricingPlan(migrateReservePlan({ ...base, ...parsed, assumptions: { ...base.assumptions, ...parsed.assumptions }, scenarios: parsed.scenarios }));
}
export function loadLegacy(): { state: PersistedState; exists: boolean } {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? { state: decodeState(JSON.parse(raw)), exists: true } : { state: defaultState(), exists: false };
  } catch { return { state: defaultState(), exists: false }; }
}
