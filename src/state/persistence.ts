import { DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIOS, acquisitionAssumptions, reinvestmentAssumptions, ACQUISITION_POLICY, type ActualEntry, type Assumptions, type ScenarioPolicy } from '../model';
import { migratePricingPlan } from './pricingMigration';
import { migrateReservePlan } from './reserveMigration';

export const LEGACY_STORAGE_KEY = 'shaar-binyamin-gym-model/v1';
export type PlanMode = 'plan' | 'actual';
export interface PersistedState {
  previousPlan?: { assumptions: Assumptions; scenarios: ScenarioPolicy[]; selectedScenarioId: string; actuals: ActualEntry[]; anchorMonth: string; mode: PlanMode };
  version: number;
  assumptions: Assumptions;
  scenarios: ScenarioPolicy[];
  selectedScenarioId: string;
  actuals: ActualEntry[];
  anchorMonth: string;
  mode: PlanMode;
}
export function defaultState(): PersistedState {
  return { version: 3, assumptions: acquisitionAssumptions(DEFAULT_ASSUMPTIONS), scenarios: [structuredClone(ACQUISITION_POLICY), ...structuredClone(DEFAULT_SCENARIOS)], selectedScenarioId: ACQUISITION_POLICY.id, actuals: [], anchorMonth: '2026-10', mode: 'plan' };
}
export function decodeState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved model');
  const parsed = value as Partial<PersistedState>;
  if (![1, 2, 3].includes(parsed.version ?? 0) || !parsed.assumptions || !Array.isArray(parsed.scenarios) || !parsed.scenarios.length || !Array.isArray(parsed.actuals)) throw new Error('Unsupported saved model');
  const base = defaultState();
  // Loading an old saved plan must never silently switch its financial strategy.
  const migrated = migratePricingPlan(migrateReservePlan({ ...base, ...parsed, assumptions: { ...DEFAULT_ASSUMPTIONS, ...parsed.assumptions }, scenarios: parsed.scenarios }));
  return { ...migrated, assumptions: reinvestmentAssumptions(migrated.assumptions) };
}
export function activateAcquisition(state: PersistedState): PersistedState {
  if (state.assumptions.acquisition?.enabled) return state;
  if (state.previousPlan?.assumptions.acquisition?.enabled) return swapPreviousPlan(state);
  const { assumptions, scenarios, selectedScenarioId, actuals, anchorMonth, mode } = structuredClone(state);
  return { ...state, previousPlan: { assumptions, scenarios, selectedScenarioId, actuals, anchorMonth, mode }, assumptions: acquisitionAssumptions(assumptions), scenarios: [structuredClone(ACQUISITION_POLICY), ...scenarios.filter(s => s.id !== ACQUISITION_POLICY.id)], selectedScenarioId: ACQUISITION_POLICY.id, actuals: [], anchorMonth: '2026-10', mode: 'plan' };
}
export function swapPreviousPlan(state: PersistedState): PersistedState {
  if (!state.previousPlan) return state;
  const { assumptions, scenarios, selectedScenarioId, actuals, anchorMonth, mode } = structuredClone(state);
  return { ...state, ...state.previousPlan, assumptions: reinvestmentAssumptions(state.previousPlan.assumptions), previousPlan: { assumptions, scenarios, selectedScenarioId, actuals, anchorMonth, mode } };
}
export function loadLegacy(): { state: PersistedState; exists: boolean } {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? { state: decodeState(JSON.parse(raw)), exists: true } : { state: defaultState(), exists: false };
  } catch { return { state: defaultState(), exists: false }; }
}
