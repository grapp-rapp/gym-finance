import { useState } from 'react';
import { cx } from './components/ui';
import { formatCurrency, formatNumber } from './lib/format';
import { useRoute, type Route } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { Financing } from './pages/Financing';
import { Inputs } from './pages/Inputs';
import { MonthlyCashFlow } from './pages/MonthlyCashFlow';
import { OperatingCosts } from './pages/OperatingCosts';
import { PlanVsActual } from './pages/PlanVsActual';
import { Reconciliation } from './pages/Reconciliation';
import { ScenarioLab } from './pages/ScenarioLab';
import { AppStateProvider, useAppState } from './state/AppState';

const NAV: Array<{ route: Route; label: string; short: string; icon: string }> = [
  { route: 'dashboard', label: 'Dashboard', short: 'Home', icon: '◧' },
  { route: 'monthly', label: 'Monthly cash flow', short: 'Monthly', icon: '▤' },
  { route: 'scenarios', label: 'Scenario lab', short: 'Scenarios', icon: '⚖' },
  { route: 'financing', label: 'Financing', short: 'Debt', icon: '◇' },
  { route: 'operating-costs', label: 'Operating costs', short: 'Costs', icon: '▦' },
  { route: 'inputs', label: 'Inputs', short: 'Inputs', icon: '⚙' },
  { route: 'actuals', label: 'Plan vs actual', short: 'Actuals', icon: '◐' },
  { route: 'reconciliation', label: 'Reconciliation', short: 'Check', icon: '✓' },
];

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}

function Shell() {
  const [route, navigate] = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const { result, selectedScenario, assumptions } = useAppState();

  const go = (next: Route) => {
    navigate(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* --- Top bar ------------------------------------------------------ */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-[15px] font-bold text-white"
              aria-hidden
            >
              SB
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-ink">
                Shaar Binyamin Gym
              </span>
              <span className="block truncate text-[12px] text-muted">
                {selectedScenario.name}
              </span>
            </span>
          </button>

          {/* Live headline numbers, always visible on desktop */}
          <div className="ml-auto hidden items-center gap-6 lg:flex">
            <HeaderStat label="Members Y1" value={formatNumber(result.years[0]?.endMembers ?? 0)} />
            <HeaderStat
              label="Lowest cash"
              value={formatCurrency(result.minCashAfterReopening)}
              tone={result.minCashAfterReopening < 0 ? 'bad' : 'good'}
            />
            <HeaderStat
              label="Debt-free"
              value={
                result.debtFreeOperatingMonth === null
                  ? '—'
                  : `Op ${result.debtFreeOperatingMonth}`
              }
            />
            <HeaderStat label="Year 5 cash" value={formatCurrency(result.year5EndingCash)} />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Menu"
            className="ml-auto rounded-xl border border-line px-3 py-2 text-ink-2 md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden max-w-[1600px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6 md:flex">
          {NAV.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => go(item.route)}
              aria-current={route === item.route ? 'page' : undefined}
              className={cx(
                'rounded-xl px-3 py-2 text-[15px] font-medium whitespace-nowrap transition',
                route === item.route
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="border-t border-line bg-surface px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => go(item.route)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[16px] font-medium transition',
                  route === item.route ? 'bg-brand-soft text-brand' : 'text-ink-2',
                )}
              >
                <span className="w-5 text-center opacity-60" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* --- Page --------------------------------------------------------- */}
      <main className="mx-auto max-w-[1600px] px-4 pt-6 pb-28 sm:px-6 md:pb-12">
        {route === 'dashboard' && <Dashboard navigate={go} />}
        {route === 'monthly' && <MonthlyCashFlow />}
        {route === 'scenarios' && <ScenarioLab />}
        {route === 'financing' && <Financing />}
        {route === 'operating-costs' && <OperatingCosts />}
        {route === 'inputs' && <Inputs navigate={go} />}
        {route === 'actuals' && <PlanVsActual />}
        {route === 'reconciliation' && <Reconciliation />}
      </main>

      {/* --- Mobile bottom bar -------------------------------------------- */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.slice(0, 5).map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => go(item.route)}
              aria-current={route === item.route ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition',
                route === item.route ? 'text-brand' : 'text-muted',
              )}
            >
              <span className="text-[17px] leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.short}
            </button>
          ))}
        </div>
      </nav>

      <footer className="no-print border-t border-line px-4 py-6 text-center text-[13px] text-muted sm:px-6">
        Modelled in ₪ · VAT {(assumptions.vatRate * 100).toFixed(0)}% · Asia/Jerusalem ·{' '}
        {assumptions.closureMonths + assumptions.operatingMonths} month timeline ·{' '}
        <button
          type="button"
          onClick={() => go('reconciliation')}
          className="underline underline-offset-2 hover:text-ink-2"
        >
          reconciled to the source spreadsheet
        </button>
      </footer>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <div className="text-right">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div
        className={cx(
          'num text-[15px] font-semibold tabular-nums',
          tone === 'bad' ? 'text-bad' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}
