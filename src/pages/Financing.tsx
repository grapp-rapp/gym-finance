import { Card, Chip, DataRow, PageHeader, SectionTitle, StatCard, cx } from '../components/ui';
import { formatCurrency, formatPercent, monthLabel } from '../lib/format';
import { loanTerms, type MonthRow } from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 6 — Financing.
 *
 * Each loan on its own, plus the sweep schedule: what has been paid, what is left,
 * when the next lump sum lands and how big it is projected to be.
 */
export function Financing() {
  const { assumptions: a, result, selectedScenario, anchorMonth } = useAppState();
  const terms = loanTerms(a);
  const months = result.months;

  const loanASummary = summariseLoan(months, 'A');
  const loanBSummary = summariseLoan(months, 'B');
  const sweeps = months.filter((m) => m.extraDebtPayment > 0);
  const nextSweep = sweeps[0];

  return (
    <div>
      <PageHeader
        title="Financing"
        subtitle={`${formatCurrency(a.loanAPrincipal + a.loanBPrincipal)} borrowed across two loans, with a ${a.graceMonths}-month free grace period.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Debt remaining"
          value={formatCurrency(a.loanAPrincipal + a.loanBPrincipal)}
          sub="At funding"
          tone="debt"
          size="lg"
        />
        <StatCard
          label="Combined payment"
          value={formatCurrency(terms.totalPayment)}
          sub={`From timeline month ${terms.paymentStartTimelineMonth} · operating month ${terms.paymentStartOperatingMonth}`}
        />
        <StatCard
          label="Debt-free"
          value={
            result.debtFreeOperatingMonth === null
              ? 'Beyond model'
              : `Op month ${result.debtFreeOperatingMonth}`
          }
          sub={
            result.debtFreeTimelineMonth === null
              ? '—'
              : monthLabel(anchorMonth, result.debtFreeTimelineMonth)
          }
          tone={result.debtFreeOperatingMonth === null ? 'warn' : 'good'}
        />
        <StatCard
          label="Interest saved"
          value={formatCurrency(result.interestSaved)}
          sub="Versus paying only the contractual schedule"
          tone="good"
        />
      </div>

      {/* --- Loan cards --------------------------------------------------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            hint="Interest free — repaid last, because it costs nothing to carry."
            right={<Chip tone="good">0% interest</Chip>}
          >
            Loan A
          </SectionTitle>
          <DataRow label="Principal" value={formatCurrency(a.loanAPrincipal)} />
          <DataRow label="Interest rate" value={formatPercent(a.loanARate, 2)} />
          <DataRow label="Normal payment" value={`${formatCurrency(terms.loanAPayment)} / month`} />
          <DataRow label="Extra paid over 5 years" value={formatCurrency(loanASummary.extraPaid)} tone="debt" />
          <DataRow label="Total interest paid" value={formatCurrency(0)} tone="good" />
          <DataRow
            label="Paid off"
            value={
              loanASummary.payoffMonth === null
                ? 'Beyond model'
                : `Operating month ${loanASummary.payoffMonth}`
            }
            emphasis
          />
        </Card>

        <Card>
          <SectionTitle
            hint="Prime linked — always repaid first, because this is the debt that costs money."
            right={<Chip tone="warn">Prime {formatPercent(terms.primeRate, 2)}</Chip>}
          >
            Loan B
          </SectionTitle>
          <DataRow label="Principal" value={formatCurrency(a.loanBPrincipal)} />
          <DataRow
            label="Interest rate"
            value={`${formatPercent(terms.primeRate, 2)} (BoI ${formatPercent(a.boiRate, 2)} + ${formatPercent(a.primeSpread, 2)})`}
          />
          <DataRow label="Normal payment" value={`${formatCurrency(terms.loanBPayment)} / month`} />
          <DataRow label="Extra paid over 5 years" value={formatCurrency(loanBSummary.extraPaid)} tone="debt" />
          <DataRow
            label="Total interest paid"
            value={formatCurrency(result.totalLoanBInterestPaid)}
            tone="warn"
          />
          <DataRow
            label="Paid off"
            value={
              result.primeDebtFreeOperatingMonth === null
                ? 'Beyond model'
                : `Operating month ${result.primeDebtFreeOperatingMonth}`
            }
            emphasis
          />
        </Card>
      </div>

      {/* --- Grace explanation -------------------------------------------- */}
      <Card className="mt-4">
        <SectionTitle hint="Why nothing happens for the first year.">The grace period</SectionTitle>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Both loans have a genuinely free {a.graceMonths}-month grace period: no payments fall due
          and no interest accrues. Because the {a.closureMonths}-month rebuild consumes part of that
          grace, the first contractual payment lands in{' '}
          <strong className="text-ink">timeline month {terms.paymentStartTimelineMonth}</strong> —
          only <strong className="text-ink">operating month {terms.paymentStartOperatingMonth}</strong>,{' '}
          {monthLabel(anchorMonth, terms.paymentStartTimelineMonth)}. From then on the combined
          contractual payment is {formatCurrency(terms.totalPayment)} per month.
        </p>
      </Card>

      {/* --- Sweeps -------------------------------------------------------- */}
      <Card className="mt-4" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle
            hint={`Every ${selectedScenario.sweepFrequency} operating months from month ${selectedScenario.firstSweepMonth}, cash above ${formatCurrency(selectedScenario.cashTarget)} goes to debt — Prime first.`}
            right={
              nextSweep ? (
                <Chip tone="debt">
                  Next sweep: op month {nextSweep.operatingMonth} ·{' '}
                  {formatCurrency(nextSweep.extraDebtPayment)}
                </Chip>
              ) : (
                <Chip tone="neutral">No sweeps in this plan</Chip>
              )
            }
          >
            Extra debt payments
          </SectionTitle>
        </div>

        {sweeps.length === 0 ? (
          <div className="px-5 pb-6 text-muted sm:px-6">
            Accelerated payoff is switched off, or the plan never has cash above the target on a
            sweep month.
          </div>
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[720px] border-collapse text-[15px]">
              <thead>
                <tr className="border-y border-line bg-surface-2 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-ink-2">When</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">
                    Cash before sweep
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">
                    To Loan B (Prime)
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">
                    To Loan A (0%)
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-ink-2">
                    Debt after
                  </th>
                </tr>
              </thead>
              <tbody>
                {sweeps.map((m) => (
                  <tr key={m.timelineMonth} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">
                        {monthLabel(anchorMonth, m.timelineMonth)}
                      </div>
                      <div className="text-[13px] text-muted">
                        Operating month {m.operatingMonth}
                      </div>
                    </td>
                    <td className="num px-3 py-3 text-right tabular-nums text-muted">
                      {formatCurrency(m.endingCash + m.extraDebtPayment)}
                    </td>
                    <td className="num px-3 py-3 text-right tabular-nums text-warn">
                      {formatCurrency(m.extraToLoanB)}
                    </td>
                    <td className="num px-3 py-3 text-right tabular-nums text-good">
                      {formatCurrency(m.extraToLoanA)}
                    </td>
                    <td className="num px-3 py-3 text-right font-semibold tabular-nums text-debt">
                      {formatCurrency(m.extraDebtPayment)}
                    </td>
                    <td className="num px-4 py-3 text-right tabular-nums">
                      {formatCurrency(m.debtRemaining)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-line-strong bg-surface-2 font-semibold">
                  <td className="px-4 py-3 text-ink">Total prepaid</td>
                  <td />
                  <td className="num px-3 py-3 text-right tabular-nums">
                    {formatCurrency(loanBSummary.extraPaid)}
                  </td>
                  <td className="num px-3 py-3 text-right tabular-nums">
                    {formatCurrency(loanASummary.extraPaid)}
                  </td>
                  <td className="num px-3 py-3 text-right text-[17px] tabular-nums text-debt">
                    {formatCurrency(result.totalExtraDebtPrepayments)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --- Balance timeline ---------------------------------------------- */}
      <Card className="mt-4" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle hint="Both balances, month by month, from funding to debt-free.">
            Loan balances
          </SectionTitle>
        </div>
        <div className="scroll-x max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[760px] border-collapse text-[14px]">
            <thead className="sticky top-0 z-2">
              <tr className="bg-surface-2 text-left">
                <th className="sticky-col border-y border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Month
                </th>
                <th className="border-y border-line px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Payment
                </th>
                <th className="border-y border-line px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Interest
                </th>
                <th className="border-y border-line px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Extra
                </th>
                <th className="border-y border-line px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Loan A left
                </th>
                <th className="border-y border-line px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Loan B left
                </th>
                <th className="border-y border-line px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Total debt
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr
                  key={m.timelineMonth}
                  className={cx(
                    'border-b border-line last:border-0 hover:bg-surface-2',
                    m.extraDebtPayment > 0 && 'bg-brand-soft/40',
                    m.debtRemaining === 0 && 'text-muted',
                  )}
                >
                  <th className="sticky-col border-r border-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    <span className="text-ink">{monthLabel(anchorMonth, m.timelineMonth)}</span>
                    <span className="ml-2 text-[12px] text-muted">
                      {m.operatingMonth > 0 ? `op ${m.operatingMonth}` : m.phase.toLowerCase()}
                    </span>
                  </th>
                  <td className="num px-3 py-2 text-right tabular-nums">
                    {formatCurrency(m.regularDebtPayment)}
                  </td>
                  <td className="num px-3 py-2 text-right tabular-nums text-warn">
                    {formatCurrency(m.loanBInterest)}
                  </td>
                  <td className="num px-3 py-2 text-right font-medium tabular-nums text-debt">
                    {formatCurrency(m.extraDebtPayment)}
                  </td>
                  <td className="num px-3 py-2 text-right tabular-nums">
                    {formatCurrency(m.loanABalance)}
                  </td>
                  <td className="num px-3 py-2 text-right tabular-nums">
                    {formatCurrency(m.loanBBalance)}
                  </td>
                  <td className="num px-4 py-2 text-right font-semibold tabular-nums">
                    {formatCurrency(m.debtRemaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function summariseLoan(months: MonthRow[], loan: 'A' | 'B') {
  const balanceOf = (m: MonthRow) => (loan === 'A' ? m.loanABalance : m.loanBBalance);
  const extraOf = (m: MonthRow) => (loan === 'A' ? m.extraToLoanA : m.extraToLoanB);
  const payoff = months.find((m) => balanceOf(m) === 0);
  return {
    extraPaid: months.reduce((sum, m) => sum + extraOf(m), 0),
    payoffMonth: payoff ? payoff.operatingMonth : null,
  };
}
