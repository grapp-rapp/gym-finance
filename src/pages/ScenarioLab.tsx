import { Button, Callout, Card, Chip, NumberField, PageHeader, SectionTitle, cx } from '../components/ui';
import { CashVsDebtChart } from '../components/charts';
import { formatCurrency, formatNumber } from '../lib/format';
import { duplicateScenario, liquidityHealth, type ScenarioResult } from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 3 — Scenario lab.
 *
 * Every owner-pay policy side by side, editable in place, recalculating instantly.
 * Green / amber / red states answer the only question that matters: can we actually
 * afford to pay ourselves this much, this early?
 */
export function ScenarioLab() {
  const {
    scenarios,
    allResults,
    selectedScenarioId,
    selectScenario,
    setScenario,
    addScenario,
    removeScenario,
    assumptions,
  } = useAppState();

  const metrics: Array<{
    label: string;
    render: (r: ScenarioResult) => React.ReactNode;
    tone?: (r: ScenarioResult) => 'good' | 'warn' | 'bad' | undefined;
    hint?: string;
  }> = [
    {
      label: 'Salary starts',
      render: (r) =>
        r.salaryStartOperatingMonth === null ? 'Never' : `Op month ${r.salaryStartOperatingMonth}`,
    },
    {
      label: 'Owner salary each',
      render: (r) =>
        r.policy.preDebtSalary > 0
          ? `${formatCurrency(r.policy.preDebtSalary)} → ${formatCurrency(r.policy.postDebtSalary)}`
          : formatCurrency(r.policy.postDebtSalary),
    },
    {
      label: 'Debt-free month',
      render: (r) =>
        r.debtFreeOperatingMonth === null ? 'Beyond model' : `Op ${r.debtFreeOperatingMonth}`,
      tone: (r) => (r.debtFreeOperatingMonth === null ? 'bad' : undefined),
    },
    {
      label: 'Prime loan clear',
      render: (r) =>
        r.primeDebtFreeOperatingMonth === null ? 'Beyond model' : `Op ${r.primeDebtFreeOperatingMonth}`,
    },
    {
      label: 'Total owner salary paid',
      render: (r) => formatCurrency(r.totalOwnerGrossSalaries),
      hint: 'Combined gross across both partners, 5 years',
    },
    {
      label: 'Company payroll cost',
      render: (r) => formatCurrency(r.totalOwnerPayrollCost),
      hint: 'Including employer costs',
    },
    {
      label: 'Interest saved',
      render: (r) => formatCurrency(r.interestSaved),
      tone: () => 'good',
    },
    {
      label: 'Total debt prepayments',
      render: (r) => formatCurrency(r.totalExtraDebtPrepayments),
    },
    {
      label: 'Lowest cash',
      render: (r) => formatCurrency(r.minCashAfterReopening),
      tone: (r) =>
        r.minCashAfterReopening < 0
          ? 'bad'
          : r.minCashAfterReopening < r.policy.cashTarget * 0.5
            ? 'warn'
            : 'good',
      hint: 'After reopening',
    },
    {
      label: 'Year 5 bank cash',
      render: (r) => formatCurrency(r.year5EndingCash),
    },
    {
      label: 'Cash above target',
      render: (r) => formatCurrency(r.year5CashAboveTarget),
    },
    {
      label: '50% share per partner',
      render: (r) => formatCurrency(r.perPartnerIfDistributed),
      hint: 'If fully distributed — not automatic',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Scenario lab"
        subtitle="Compare owner-pay policies side by side. Edit any assumption and every number recalculates immediately."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              const source = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];
              addScenario(duplicateScenario(source, scenarios.map((s) => s.id)));
            }}
          >
            + Duplicate selected
          </Button>
        }
      />

      {allResults.some((r) => r.liquidityFailure) && (
        <div className="mb-5">
          <Callout tone="bad" title="One or more scenarios run out of cash">
            A red "lowest cash" figure means the business goes overdrawn under those assumptions. It
            is not a viable plan without changing the salary timing, the salary level, or the cash
            target.
          </Callout>
        </div>
      )}

      {/* --- Editable policy cards ---------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {allResults.map((result) => {
          const policy = result.policy;
          const health = liquidityHealth(result);
          const selected = policy.id === selectedScenarioId;
          return (
            <Card
              key={policy.id}
              className={cx(
                'flex flex-col',
                selected && 'ring-2 ring-brand',
                health === 'danger' && 'border-bad/50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[17px] font-semibold text-ink">{policy.name}</h3>
                  {/* Reserve three lines so the input rows stay aligned across all cards. */}
                  <p className="mt-0.5 min-h-[3.2rem] text-[13px] leading-snug text-muted">
                    {policy.description}
                  </p>
                </div>
                <Chip tone={health === 'danger' ? 'bad' : health === 'tight' ? 'warn' : 'good'}>
                  {health === 'danger' ? 'Unsafe' : health === 'tight' ? 'Tight' : 'Healthy'}
                </Chip>
              </div>

              <div className="mt-4 space-y-3">
                <NumberField
                  label="Pre-debt salary each / month"
                  value={policy.preDebtSalary}
                  onChange={(value) => setScenario(policy.id, { preDebtSalary: value })}
                  prefix="₪"
                  step={500}
                  min={0}
                />
                <NumberField
                  label="Salary start — operating month"
                  value={policy.preDebtStartMonth}
                  onChange={(value) => setScenario(policy.id, { preDebtStartMonth: value })}
                  step={1}
                  min={0}
                  max={60}
                  // Always render a hint so the fields stay aligned across the four cards.
                  hint={
                    policy.preDebtSalary === 0
                      ? 'No effect while the pre-debt salary is ₪0'
                      : 'When the pre-debt salary begins'
                  }
                />
                <NumberField
                  label="Post-debt salary each / month"
                  value={policy.postDebtSalary}
                  onChange={(value) => setScenario(policy.id, { postDebtSalary: value })}
                  prefix="₪"
                  step={500}
                  min={0}
                />
                <NumberField
                  label="Cash target"
                  value={policy.cashTarget}
                  onChange={(value) => setScenario(policy.id, { cashTarget: value })}
                  prefix="₪"
                  step={10000}
                  min={0}
                />
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="First sweep (op mo)"
                    value={policy.firstSweepMonth}
                    onChange={(value) => setScenario(policy.id, { firstSweepMonth: value })}
                    step={1}
                    min={1}
                    max={60}
                  />
                  <NumberField
                    label="Every N months"
                    value={policy.sweepFrequency}
                    onChange={(value) => setScenario(policy.id, { sweepFrequency: Math.max(1, value) })}
                    step={1}
                    min={1}
                    max={24}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button
                  variant={selected ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => selectScenario(policy.id)}
                >
                  {selected ? 'Selected' : 'Use this'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => addScenario(duplicateScenario(policy, scenarios.map((s) => s.id)))}
                >
                  Duplicate
                </Button>
                {!policy.builtIn && (
                  <Button variant="danger" size="sm" onClick={() => removeScenario(policy.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* --- Comparison table --------------------------------------------- */}
      <Card className="mt-6" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle hint="Every scenario against the same assumptions.">
            Side-by-side comparison
          </SectionTitle>
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="border-y border-line bg-surface-2">
                <th className="sticky-col px-4 py-3 text-left text-sm font-semibold text-ink-2">
                  Metric
                </th>
                {allResults.map((r) => (
                  <th
                    key={r.policy.id}
                    className={cx(
                      'px-3 py-3 text-right text-sm font-semibold whitespace-nowrap',
                      r.policy.id === selectedScenarioId ? 'text-brand' : 'text-ink-2',
                    )}
                  >
                    {r.policy.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <th className="sticky-col px-4 py-2.5 text-left font-medium">
                    <div className="text-[15px] text-ink">{metric.label}</div>
                    {metric.hint && <div className="text-[12px] text-muted">{metric.hint}</div>}
                  </th>
                  {allResults.map((r) => {
                    const tone = metric.tone?.(r);
                    return (
                      <td
                        key={r.policy.id}
                        className={cx(
                          'num px-3 py-2.5 text-right tabular-nums whitespace-nowrap',
                          tone === 'bad' && 'font-semibold text-bad',
                          tone === 'warn' && 'font-semibold text-warn',
                          tone === 'good' && 'text-good',
                        )}
                      >
                        {metric.render(r)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-line-strong bg-surface-2">
                <th className="sticky-col px-4 py-3 text-left font-semibold text-ink">
                  Liquidity warning
                </th>
                {allResults.map((r) => {
                  const health = liquidityHealth(r);
                  return (
                    <td key={r.policy.id} className="px-3 py-3 text-right">
                      <Chip tone={health === 'danger' ? 'bad' : health === 'tight' ? 'warn' : 'good'}>
                        {health === 'danger'
                          ? 'Goes negative'
                          : health === 'tight'
                            ? 'Runs tight'
                            : 'Healthy'}
                      </Chip>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- Cash curves -------------------------------------------------- */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {allResults.map((r) => (
          <Card key={r.policy.id}>
            <SectionTitle
              hint={`Lowest cash after reopening: ${formatCurrency(r.minCashAfterReopening)} · ${formatNumber(
                r.months[r.months.length - 1].totalMembers,
              )} members at year 5`}
              right={
                <Chip tone={r.liquidityFailure ? 'bad' : 'good'}>
                  {r.liquidityFailure ? 'Unsafe' : 'Viable'}
                </Chip>
              }
            >
              {r.policy.name}
            </SectionTitle>
            <CashVsDebtChart months={r.months} cashTarget={r.policy.cashTarget} height={240} />
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        Employer load of {(assumptions.employerLoad * 100).toFixed(0)}% is applied to every owner
        salary — ₪10,000 gross each costs the company{' '}
        {formatCurrency(20000 * (1 + assumptions.employerLoad))} per month.
      </p>
    </div>
  );
}
