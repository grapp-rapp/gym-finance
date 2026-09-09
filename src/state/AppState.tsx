import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_SCENARIOS,
  runModel,
  runScenarios,
  type ActualEntry,
  type Assumptions,
  type ScenarioPolicy,
  type ScenarioResult,
} from '../model';

/**
 * Application state.
 *
 * Everything the user can change lives here: assumptions, owner-pay scenarios, which
 * scenario is selected, and any actuals they have entered. The model itself stays pure —
 * this layer only holds inputs and memoises the results.
 *
 * Persistence is localStorage today. The shape is deliberately a single serialisable
 * object so swapping in a cloud datastore later is a change to two functions, not the app.
 */

const STORAGE_KEY = 'shaar-binyamin-gym-model/v1';
const STORAGE_VERSION = 1;

export type PlanMode = 'plan' | 'actual';

interface PersistedState {
  version: number;
  assumptions: Assumptions;
  scenarios: ScenarioPolicy[];
  selectedScenarioId: string;
  actuals: ActualEntry[];
  /** Calendar month that timeline month 0 corresponds to, e.g. "2026-09". */
  anchorMonth: string;
  mode: PlanMode;
}

function defaultState(): PersistedState {
  return {
    version: STORAGE_VERSION,
    assumptions: DEFAULT_ASSUMPTIONS,
    scenarios: DEFAULT_SCENARIOS,
    selectedScenarioId: 'A',
    actuals: [],
    anchorMonth: '2026-09',
    mode: 'plan',
  };
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== STORAGE_VERSION) return defaultState();
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      // Merge assumptions field-by-field so a saved state from an older build that
      // predates a new input still gets a sensible default for it.
      assumptions: { ...base.assumptions, ...(parsed.assumptions ?? {}) },
      scenarios: parsed.scenarios?.length ? parsed.scenarios : base.scenarios,
    };
  } catch {
    return defaultState();
  }
}

interface AppStateValue {
  assumptions: Assumptions;
  scenarios: ScenarioPolicy[];
  selectedScenarioId: string;
  selectedScenario: ScenarioPolicy;
  actuals: ActualEntry[];
  anchorMonth: string;
  mode: PlanMode;

  /** Result for the currently selected owner-pay scenario. */
  result: ScenarioResult;
  /** Results for every scenario — used by the Scenario Lab comparison. */
  allResults: ScenarioResult[];

  setAssumptions: (update: Partial<Assumptions>) => void;
  setScenario: (id: string, update: Partial<ScenarioPolicy>) => void;
  addScenario: (policy: ScenarioPolicy) => void;
  removeScenario: (id: string) => void;
  selectScenario: (id: string) => void;
  setActual: (timelineMonth: number, update: Partial<ActualEntry>) => void;
  clearActual: (timelineMonth: number) => void;
  setAnchorMonth: (value: string) => void;
  setMode: (mode: PlanMode) => void;
  resetAll: () => void;
  /** True while the saved state differs from the shipped spreadsheet defaults. */
  isModified: boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota — the app still works, it just will not persist.
    }
  }, [state]);

  const selectedScenario = useMemo(
    () => state.scenarios.find((s) => s.id === state.selectedScenarioId) ?? state.scenarios[0],
    [state.scenarios, state.selectedScenarioId],
  );

  const result = useMemo(
    () => runModel(state.assumptions, selectedScenario),
    [state.assumptions, selectedScenario],
  );

  const allResults = useMemo(
    () => runScenarios(state.assumptions, state.scenarios),
    [state.assumptions, state.scenarios],
  );

  const setAssumptions = useCallback((update: Partial<Assumptions>) => {
    setState((prev) => ({ ...prev, assumptions: { ...prev.assumptions, ...update } }));
  }, []);

  const setScenario = useCallback((id: string, update: Partial<ScenarioPolicy>) => {
    setState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, ...update } : s)),
    }));
  }, []);

  const addScenario = useCallback((policy: ScenarioPolicy) => {
    setState((prev) => ({
      ...prev,
      scenarios: [...prev.scenarios, policy],
      selectedScenarioId: policy.id,
    }));
  }, []);

  const removeScenario = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.scenarios.filter((s) => s.id !== id);
      if (remaining.length === 0) return prev;
      return {
        ...prev,
        scenarios: remaining,
        selectedScenarioId:
          prev.selectedScenarioId === id ? remaining[0].id : prev.selectedScenarioId,
      };
    });
  }, []);

  const selectScenario = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedScenarioId: id }));
  }, []);

  const setActual = useCallback((timelineMonth: number, update: Partial<ActualEntry>) => {
    setState((prev) => {
      const existing = prev.actuals.find((entry) => entry.timelineMonth === timelineMonth);
      const merged: ActualEntry = { ...(existing ?? { timelineMonth }), ...update, timelineMonth };
      return {
        ...prev,
        actuals: existing
          ? prev.actuals.map((entry) => (entry.timelineMonth === timelineMonth ? merged : entry))
          : [...prev.actuals, merged].sort((a, b) => a.timelineMonth - b.timelineMonth),
      };
    });
  }, []);

  const clearActual = useCallback((timelineMonth: number) => {
    setState((prev) => ({
      ...prev,
      actuals: prev.actuals.filter((entry) => entry.timelineMonth !== timelineMonth),
    }));
  }, []);

  const setAnchorMonth = useCallback((anchorMonth: string) => {
    setState((prev) => ({ ...prev, anchorMonth }));
  }, []);

  const setMode = useCallback((mode: PlanMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const resetAll = useCallback(() => setState(defaultState()), []);

  const isModified = useMemo(
    () =>
      JSON.stringify(state.assumptions) !== JSON.stringify(DEFAULT_ASSUMPTIONS) ||
      JSON.stringify(state.scenarios) !== JSON.stringify(DEFAULT_SCENARIOS),
    [state.assumptions, state.scenarios],
  );

  const value: AppStateValue = {
    assumptions: state.assumptions,
    scenarios: state.scenarios,
    selectedScenarioId: state.selectedScenarioId,
    selectedScenario,
    actuals: state.actuals,
    anchorMonth: state.anchorMonth,
    mode: state.mode,
    result,
    allResults,
    setAssumptions,
    setScenario,
    addScenario,
    removeScenario,
    selectScenario,
    setActual,
    clearActual,
    setAnchorMonth,
    setMode,
    resetAll,
    isModified,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
