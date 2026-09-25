import { actualTotals } from '../model/actuals';
import { useMemo, useState } from 'react';
import { PlanVsActualChart } from '../components/charts';
import {
  Button,
  Callout,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatCard,
  cx,
} from '../components/ui';
import {
  formatCurrency,
  formatNumber,
  formatVariance,
  monthLabel,
  varianceClass,
} from '../lib/format';
import type { ActualEntry, MonthRow } from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 7 — Plan vs Actual.
 *
 * The forecast is only useful if you can see how reality is tracking against it.
 * Enter what actually happened each month; the app shows the variance and, where the
 * bank balance is entered, treats that as the truth.
 */

interface VarianceRow {
  month: MonthRow;
  actual: ActualEntry | undefined;
  actualCashIn: number | null;
  actualCashOut: number | null;
  cashInVariance: number | null;
  cashOutVariance: number | null;
  endingCashVariance: number | null;
  membersVariance: number | null;
}

export function PlanVsActual() {
  const { result, actuals, setActual, clearActual, anchorMonth, assumptions } = useAppState();
  const [editing, setEditing] = useState<number | null>(null);

  const rows = useMemo<VarianceRow[]>(() => {
    return result.months
      .filter((m) => m.operatingMonth > 0)
      .map((month) => {
        const actual = actuals.find((entry) => entry.timelineMonth === month.timelineMonth);
        const { cashIn: actualCashIn, cashOut: actualCashOut } = actualTotals(actual);

        return {
          month,
          actual,
          actualCashIn,
          actualCashOut,
          cashInVariance: actualCashIn === null ? null : actualCashIn - month.totalCashIn,
          cashOutVariance: actualCashOut === null ? null : actualCashOut - month.totalCashOut,
          endingCashVariance:
            actual?.endingCash === undefined ? null : actual.endingCash - month.endingCash,
          membersVariance: actual?.members === undefined ? null : actual.members - month.totalMembers,
        };
      });
  }, [result.months, actuals]);

  const entered = rows.filter((r) => r.actual !== undefined);
  const latest = entered[entered.length - 1];

  const chartData = rows.slice(0, 24).map((r) => ({
    label: monthLabel(anchorMonth, r.month.timelineMonth),
    planned: Math.round(r.month.endingCash),
    actual: r.actual?.endingCash ?? null,
  }));

  // Compare like with like: a month only contributes to the cash-in totals if its cash-in
  // actuals were entered, and likewise for cash out. Counting a blank as zero would make
  // an unrecorded month look like a huge favourable variance.
  const withCashIn = entered.filter((r) => r.actualCashIn !== null);
  const withCashOut = entered.filter((r) => r.actualCashOut !== null);
  const sum = (rows: VarianceRow[], pick: (r: VarianceRow) => number) =>
    rows.reduce((total, r) => total + pick(r), 0);

  const totals = {
    plannedIn: sum(withCashIn, (r) => r.month.totalCashIn),
    actualIn: sum(withCashIn, (r) => r.actualCashIn ?? 0),
    plannedOut: sum(withCashOut, (r) => r.month.totalCashOut),
    actualOut: sum(withCashOut, (r) => r.actualCashOut ?? 0),
  };

  return (
    <div>
      <PageHeader
        title="Plan vs actual"
        subtitle="Enter what really happened each month. Totals appear only when all their fields are filled; enter 0 for categories with no activity."
      />

      {entered.length === 0 ? (
        <Callout tone="brand" title="No actuals entered yet">
          Pick any month below and enter what actually came in and went out. Everything is saved in
          this browser, and the plan itself is never changed.
        </Callout>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Months recorded"
            value={formatNumber(entered.length, { showZero: true })}
            sub={`of ${rows.length} operating months`}
          />
          <StatCard
            label="Cash in vs plan"
            value={withCashIn.length ? formatVariance(totals.actualIn - totals.plannedIn) : '—'}
            sub={
              withCashIn.length
                ? `${formatCurrency(totals.actualIn)} actual vs ${formatCurrency(totals.plannedIn)} planned over ${withCashIn.length} ${withCashIn.length === 1 ? 'month' : 'months'}`
                : 'No cash-in actuals recorded yet'
            }
            tone={
              !withCashIn.length ? 'neutral' : totals.actualIn >= totals.plannedIn ? 'good' : 'bad'
            }
          />
          <StatCard
            label="Cash out vs plan"
            value={withCashOut.length ? formatVariance(totals.actualOut - totals.plannedOut) : '—'}
            sub={
              withCashOut.length
                ? `${formatCurrency(totals.actualOut)} actual vs ${formatCurrency(totals.plannedOut)} planned over ${withCashOut.length} ${withCashOut.length === 1 ? 'month' : 'months'}`
                : 'No cash-out actuals recorded yet'
            }
            tone={
              !withCashOut.length ? 'neutral' : totals.actualOut <= totals.plannedOut ? 'good' : 'bad'
            }
          />
          <StatCard
            label="Latest bank balance"
            value={
              latest?.actual?.endingCash === undefined
                ? '—'
                : formatCurrency(latest.actual.endingCash)
            }
            sub={
              latest?.endingCashVariance === null || latest?.endingCashVariance === undefined
                ? 'Not recorded'
                : `${formatVariance(latest.endingCashVariance)} vs plan`
            }
            tone={
              latest?.endingCashVariance !== null && (latest?.endingCashVariance ?? 0) < 0
                ? 'warn'
                : 'good'
            }
          />
        </div>
      )}

      {entered.length > 0 && (
        <Card className="mt-6">
          <SectionTitle hint="Planned ending bank cash against what the bank actually said.">
            Bank cash — plan vs actual
          </SectionTitle>
          <PlanVsActualChart data={chartData} label="ending cash" />
        </Card>
      )}

      <Card className="mt-6" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle hint="Tap a month to enter or edit its actuals.">
            Monthly variance
          </SectionTitle>
        </div>
        <div className="scroll-x max-h-[560px] overflow-y-auto">
          <table className="w-full min-w-[980px] border-collapse text-[14px]">
            <thead className="sticky top-0 z-2">
              <tr className="bg-surface-2 text-left">
                <th className="sticky-col border-y border-line bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Month
                </th>
                <Th>Planned cash in</Th>
                <Th>Actual cash in</Th>
                <Th>Variance</Th>
                <Th>Planned cash out</Th>
                <Th>Actual cash out</Th>
                <Th>Variance</Th>
                <Th>Planned ending cash</Th>
                <Th>Actual ending cash</Th>
                <Th>Variance</Th>
                <Th>Members</Th>
                <th className="border-y border-line px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.month.timelineMonth}
                  className={cx(
                    'border-b border-line last:border-0 hover:bg-surface-2',
                    row.actual && 'bg-brand-soft/25',
                  )}
                >
                  <th className="sticky-col border-r border-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    <div className="text-ink">{monthLabel(anchorMonth, row.month.timelineMonth)}</div>
                    <div className="text-[12px] text-muted">Op {row.month.operatingMonth}</div>
                  </th>
                  <Td muted>{formatCurrency(row.month.totalCashIn)}</Td>
                  <Td>{row.actualCashIn === null ? '—' : formatCurrency(row.actualCashIn)}</Td>
                  <Td className={varianceClass(row.cashInVariance)}>
                    {formatVariance(row.cashInVariance)}
                  </Td>
                  <Td muted>{formatCurrency(row.month.totalCashOut)}</Td>
                  <Td>{row.actualCashOut === null ? '—' : formatCurrency(row.actualCashOut)}</Td>
                  <Td className={varianceClass(row.cashOutVariance, false)}>
                    {formatVariance(row.cashOutVariance)}
                  </Td>
                  <Td muted>{formatCurrency(row.month.endingCash)}</Td>
                  <Td>
                    {row.actual?.endingCash === undefined
                      ? '—'
                      : formatCurrency(row.actual.endingCash)}
                  </Td>
                  <Td className={varianceClass(row.endingCashVariance)}>
                    {formatVariance(row.endingCashVariance)}
                  </Td>
                  <Td>
                    <span className="text-muted">{formatNumber(row.month.totalMembers)}</span>
                    {row.actual?.members !== undefined && (
                      <>
                        {' → '}
                        <span className={varianceClass(row.membersVariance)}>
                          {formatNumber(row.actual.members)}
                        </span>
                      </>
                    )}
                  </Td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" onClick={() => setEditing(row.month.timelineMonth)}>
                      {row.actual ? 'Edit' : 'Enter'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {rows.length === 0 && <EmptyState>No operating months in the current model.</EmptyState>}

      {editing !== null && (
        <ActualEditor
          month={result.months[editing]}
          actual={actuals.find((entry) => entry.timelineMonth === editing)}
          anchorMonth={anchorMonth}
          partner1={assumptions.partner1Name}
          partner2={assumptions.partner2Name}
          onSave={(patch) => setActual(editing, patch)}
          onClear={() => {
            clearActual(editing);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-y border-line bg-surface-2 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-muted">
      {children}
    </th>
  );
}

function Td({
  children,
  muted,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cx(
        'num px-3 py-2 text-right tabular-nums whitespace-nowrap',
        muted && 'text-muted',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Month entry sheet. Each field is optional — record only what you know. */
function ActualEditor({
  month,
  actual,
  anchorMonth,
  partner1,
  partner2,
  onSave,
  onClear,
  onClose,
}: {
  month: MonthRow;
  actual: ActualEntry | undefined;
  anchorMonth: string;
  partner1: string;
  partner2: string;
  onSave: (patch: Partial<ActualEntry>) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const fields: Array<{
    key: keyof ActualEntry;
    label: string;
    planned: number;
    isCurrency: boolean;
  }> = [
    { key: 'members', label: 'Members', planned: month.totalMembers, isCurrency: false },
    {
      key: 'membershipCashIn',
      label: 'Membership collected',
      planned: month.membershipCashIn,
      isCurrency: true,
    },
    { key: 'otherCashIn', label: 'Other income collected', planned: month.otherCashIn, isCurrency: true },
    {
      key: 'operatingCashOut',
      label: 'Operating cash out',
      planned: month.operatingCashOut,
      isCurrency: true,
    },
    {
      key: 'debtPayment',
      label: 'Debt paid (normal + extra)',
      planned: month.regularDebtPayment + month.extraDebtPayment,
      isCurrency: true,
    },
    { key: 'corporateTax', label: 'Corporate tax paid', planned: month.corporateTax, isCurrency: true },
    {
      key: 'ownerPayroll',
      label: `Owner payroll (${partner1} + ${partner2} + employer)`,
      planned: month.ownerPayrollTotal,
      isCurrency: true,
    },
    { key: 'endingCash', label: 'Ending bank balance', planned: month.endingCash, isCurrency: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {monthLabel(anchorMonth, month.timelineMonth)}
            </h2>
            <p className="text-sm text-muted">Operating month {month.operatingMonth} — actuals</p>
          </div>
          <Button variant="ghost" onClick={onClose} title="Close">
            ✕
          </Button>
        </div>

        <p className="mt-3 text-sm text-muted">
          Leave anything blank that you do not have yet. The plan is never overwritten.
        </p>

        <div className="mt-4 space-y-3">
          {fields.map((field) => {
            const value = actual?.[field.key];
            return (
              <div key={String(field.key)} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-medium text-ink-2">{field.label}</label>
                  <div className="text-[12px] text-muted">
                    Planned{' '}
                    <span className="num tabular-nums">
                      {field.isCurrency ? formatCurrency(field.planned) : formatNumber(field.planned)}
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  value={typeof value === 'number' ? value : ''}
                  placeholder="—"
                  onChange={(event) => {
                    const raw = event.target.value;
                    onSave({ [field.key]: raw === '' ? undefined : Number(raw) } as Partial<ActualEntry>);
                  }}
                  className="num w-36 shrink-0 rounded-xl border border-line bg-surface-2 px-3 py-2 text-right tabular-nums outline-none focus:border-brand"
                />
              </div>
            );
          })}

          <div>
            <label className="block text-sm font-medium text-ink-2">Note</label>
            <textarea
              value={actual?.note ?? ''}
              rows={2}
              placeholder="Anything worth remembering about this month…"
              onChange={(event) => onSave({ note: event.target.value })}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {actual ? (
            <Button variant="danger" onClick={onClear}>
              Clear this month
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {actual && <Chip tone="good">Saved</Chip>}
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
