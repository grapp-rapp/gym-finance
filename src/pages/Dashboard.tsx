import { CashInOutChart, CashVsDebtChart, MembersChart } from '../components/charts';
import { Callout, Card, Chip, PageHeader, SectionTitle, StatCard, cx } from '../components/ui';
import { formatCurrency, formatNumber, monthLabel } from '../lib/format';
import { liquidityHealth } from '../model';
import { useAppState } from '../state/AppState';
import type { Route } from '../lib/router';

/**
 * PAGE 1 — Owner dashboard.
 *
 * The ten-second question set: how many members, what comes in, what goes out,
 * what is in the bank, how much debt is left, what we pay ourselves, when debt ends,
 * and whether we are above or below the cash target.
 */
export function Dashboard({ navigate }: { navigate: (route: Route) => void }) {
  const { result, assumptions, selectedScenario, anchorMonth, scenarios, selectScenario } =
    useAppState();

  const health = liquidityHealth(result);
  const year1 = result.years[0];
  const lowestTone = result.minCashAfterReopening < 0 ? 'bad' : result.minCashAfterReopening < selectedScenario.cashTarget ? 'warn' : 'good';

  const debtFreeLabel =
    result.debtFreeOperatingMonth === null
      ? 'Beyond 5 years'
      : `Operating month ${result.debtFreeOperatingMonth}`;
  const debtFreeSub =
    result.debtFreeTimelineMonth === null
      ? 'Debt is not cleared inside the modelled window'
      : `${monthLabel(anchorMonth, result.debtFreeTimelineMonth)} · ${result.monthsDebtEliminatedEarly} months early`;

  return (
    <div>
      <PageHeader
        title="Owner dashboard"
        subtitle="Shaar Binyamin gym — what comes in, what goes out, what is left in the bank."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {scenarios.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => selectScenario(policy.id)}
                className={cx(
                  'rounded-xl border px-3 py-1.5 text-sm font-medium transition',
                  policy.id === selectedScenario.id
                    ? 'border-transparent bg-brand text-white'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                )}
              >
                {policy.name}
              </button>
            ))}
          </div>
        }
      />

      {health === 'danger' && (
        <div className="mb-5">
          <Callout tone="bad" title="This plan runs out of money">
            Under the current assumptions, bank cash falls to{' '}
            <strong className="num">{formatCurrency(result.minCashAfterReopening)}</strong> after
            reopening. The business cannot fund this owner-pay policy — either start salaries later,
            lower them, or lower the cash target.
          </Callout>
        </div>
      )}

      {/* --- Top cards --------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Members today"
          value={formatNumber(assumptions.currentMembers)}
          sub={`${formatNumber(result.reopeningMembers)} expected back at reopening`}
          size="lg"
        />
        <StatCard
          label="End of year 1"
          value={formatNumber(year1?.endMembers ?? 0)}
          sub={`Capacity ${formatNumber(assumptions.capacity)}`}
          size="lg"
        />
        <StatCard
          label="Cash after build"
          value={formatCurrency(result.cashAfterBuild)}
          sub="Includes the modelled VAT refund"
          tone="brand"
        />
        <StatCard
          label="Cash target"
          value={formatCurrency(selectedScenario.cashTarget)}
          sub="Kept in the company before extra debt payments"
        />
        <StatCard
          label="Lowest modelled cash"
          value={formatCurrency(result.minCashAfterReopening)}
          sub="After reopening — the runway test"
          tone={lowestTone}
        />
        <StatCard
          label="Debt remaining today"
          value={formatCurrency(assumptions.loanAPrincipal + assumptions.loanBPrincipal)}
          sub={`${formatCurrency(result.contractualMonthlyDebtService)} / month after grace`}
          tone="debt"
        />
        <StatCard
          label="Debt-free"
          value={debtFreeLabel}
          sub={debtFreeSub}
          tone={result.debtFreeOperatingMonth === null ? 'warn' : 'good'}
        />
        <StatCard
          label="Owner salary starts"
          value={
            result.salaryStartOperatingMonth === null
              ? 'Not in plan'
              : `Operating month ${result.salaryStartOperatingMonth}`
          }
          sub={
            result.salaryStartOperatingMonth === null
              ? 'No owner salary in this scenario'
              : `${formatCurrency(
                  result.months.find((m) => m.operatingMonth === result.salaryStartOperatingMonth)
                    ?.partner1Gross ?? 0,
                )} gross each per month`
          }
        />
      </div>

      {/* --- Year table -------------------------------------------------- */}
      <Card className="mt-6" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle
            hint="Cash collected less every cash use, reconciling exactly to ending bank cash."
            right={
              <Chip tone={health === 'danger' ? 'bad' : health === 'tight' ? 'warn' : 'good'}>
                {selectedScenario.name}
              </Chip>
            }
          >
            Five operating years
          </SectionTitle>
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[900px] border-collapse text-[15px]">
            <thead>
              <tr className="border-y border-line bg-surface-2 text-left">
                <th className="sticky-col px-4 py-3 text-sm font-semibold text-ink-2">Year</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Cash in</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Operating out</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Debt paid</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Tax paid</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Owner payroll</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Total out</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Net change</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Ending cash</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Debt left</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-ink-2">Members</th>
              </tr>
            </thead>
            <tbody>
              {result.years.map((year) => (
                <tr key={year.year} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="sticky-col px-4 py-3 font-semibold text-ink">Year {year.year}</td>
                  <td className="num px-3 py-3 text-right tabular-nums">{formatCurrency(year.cashIn)}</td>
                  <td className="num px-3 py-3 text-right tabular-nums text-ink-2">
                    {formatCurrency(year.operatingCashOut)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums text-debt">
                    {formatCurrency(year.debtPaid)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums text-ink-2">
                    {formatCurrency(year.taxPaid)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums text-ink-2">
                    {formatCurrency(year.ownerPayroll)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums">
                    {formatCurrency(year.totalCashOut)}
                  </td>
                  <td
                    className={cx(
                      'num px-3 py-3 text-right font-semibold tabular-nums',
                      year.netCashChange < 0 ? 'text-bad' : 'text-good',
                    )}
                  >
                    {formatCurrency(year.netCashChange)}
                  </td>
                  <td className="num px-3 py-3 text-right font-semibold tabular-nums text-ink">
                    {formatCurrency(year.endingCash)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums text-debt">
                    {formatCurrency(year.debtRemaining)}
                  </td>
                  <td className="num px-4 py-3 text-right tabular-nums">{formatNumber(year.endMembers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 text-[13px] text-muted sm:px-6">
          Cash in is gross collections. Operating cash out is the day-to-day gym cash cost including
          card fees and the net VAT effect; debt, tax and owner payroll are shown separately.{' '}
          <button
            type="button"
            onClick={() => navigate('monthly')}
            className="font-medium text-brand underline underline-offset-2"
          >
            See it month by month
          </button>
          .
        </div>
      </Card>

      {/* --- Charts ------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <SectionTitle hint="The whole 63-month timeline, including the three build months.">
            Bank cash vs debt remaining
          </SectionTitle>
          <CashVsDebtChart months={result.months} cashTarget={selectedScenario.cashTarget} height={300} />
        </Card>
        <Card>
          <SectionTitle hint="Everything collected against everything paid out, per operating year.">
            Cash in vs cash out
          </SectionTitle>
          <CashInOutChart years={result.years} />
        </Card>
        <Card>
          <SectionTitle hint="Total paying members across the 60 operating months.">
            Members over time
          </SectionTitle>
          <MembersChart months={result.months} capacity={assumptions.capacity} />
        </Card>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        Accounting measures — EBITDA, depreciation, DSCR, taxable income — are kept out of the way on
        the{' '}
        <button
          type="button"
          onClick={() => navigate('reconciliation')}
          className="font-medium text-brand underline underline-offset-2"
        >
          reconciliation
        </button>{' '}
        and monthly screens.
      </p>
    </div>
  );
}
