import { useMemo, useState } from 'react';
import { Button, Callout, Card, Chip, DataRow, PageHeader, Segmented, cx, type Tone } from '../components/ui';
import {
  formatCurrency,
  formatNumber,
  monthDescription,
  monthLabel,
  shortMonthTag,
} from '../lib/format';
import { explainNetCashChange, type MonthEvent, type MonthRow } from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 2 — Monthly cash flow.
 *
 * All 63 timeline months. Wide on desktop with a sticky month column; on mobile the
 * same data becomes a tap-through list of month cards. Tapping any month anywhere opens
 * a full detail panel.
 */

const EVENT_TONE: Record<MonthEvent, Tone> = {
  FUNDING: 'brand',
  BUILD: 'neutral',
  REOPEN: 'good',
  'DEBT START': 'warn',
  'DEBT SWEEP': 'debt',
  'SALARY START': 'brand',
  'YEAR END': 'neutral',
  'DEBT FREE': 'good',
};

type Filter = 'all' | 'operating' | 'events';

export function MonthlyCashFlow() {
  const { result, selectedScenario, anchorMonth, assumptions } = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  const rows = useMemo(() => {
    if (filter === 'operating') return result.months.filter((m) => m.operatingMonth > 0);
    if (filter === 'events')
      return result.months.filter((m) => m.events.some((e) => e !== 'BUILD' && e !== 'YEAR END') || m.events.includes('YEAR END'));
    return result.months;
  }, [result.months, filter]);

  const detail = openMonth === null ? null : result.months[openMonth];

  return (
    <div>
      <PageHeader
        title="Monthly cash flow"
        subtitle={`${result.months.length} timeline months — ${assumptions.closureMonths} build months plus ${assumptions.operatingMonths} operating months. Tap any month for the full picture.`}
        actions={
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All months' },
              { value: 'operating', label: 'Operating only' },
              { value: 'events', label: 'Key months' },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Chip tone="brand">{selectedScenario.name}</Chip>
        <Chip tone="neutral">Cash target {formatCurrency(selectedScenario.cashTarget)}</Chip>
        <Chip tone="debt">
          Sweeps every {selectedScenario.sweepFrequency} months from op month{' '}
          {selectedScenario.firstSweepMonth}
        </Chip>
      </div>

      {/* --- Desktop / tablet table -------------------------------------- */}
      <Card className="hidden md:block" padded={false}>
        <div className="scroll-x max-h-[calc(100vh-16rem)] overflow-y-auto">
          <table className="w-full min-w-[1580px] border-collapse text-[14px]">
            <thead className="sticky top-0 z-3">
              <tr className="bg-surface-2 text-left">
                <th className="sticky-col border-b border-line bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Month
                </th>
                <ColGroupHead span={3} label="Where we are" />
                <ColGroupHead span={4} label="Cash in" tone="good" />
                <ColGroupHead span={8} label="Cash out" tone="bad" />
                <ColGroupHead span={5} label="Result" tone="brand" />
                <th className="border-b border-line bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Event
                </th>
              </tr>
              <tr className="bg-surface-2">
                <th className="sticky-col border-b border-line bg-surface-2 px-3 pb-2 text-left text-xs font-medium text-muted">
                  Timeline
                </th>
                <Th>Phase</Th>
                <Th>Op mo</Th>
                <Th right>Members</Th>
                <Th right>Membership</Th>
                <Th right>Other</Th>
                <Th right>VAT refund</Th>
                <Th right strong>Total in</Th>
                <Th right>Operating out</Th>
                <Th right>Loan payment</Th>
                <Th right>Extra debt</Th>
                <Th right>Tax</Th>
                <Th right>{assumptions.partner1Name}</Th>
                <Th right>{assumptions.partner2Name}</Th>
                <Th right>Employer costs</Th>
                <Th right strong>Total out</Th>
                <Th right strong>Net change</Th>
                <Th right>Opening cash</Th>
                <Th right strong>Ending cash</Th>
                <Th right>Debt left</Th>
                <Th right>vs target</Th>
                <th className="border-b border-line bg-surface-2 px-3 pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <MonthTableRow
                  key={m.timelineMonth}
                  month={m}
                  anchorMonth={anchorMonth}
                  onOpen={() => setOpenMonth(m.timelineMonth)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- Mobile card list -------------------------------------------- */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((m) => (
          <MonthMobileCard
            key={m.timelineMonth}
            month={m}
            anchorMonth={anchorMonth}
            onOpen={() => setOpenMonth(m.timelineMonth)}
          />
        ))}
      </div>

      {detail && (
        <MonthDetail
          month={detail}
          anchorMonth={anchorMonth}
          partner1={assumptions.partner1Name}
          partner2={assumptions.partner2Name}
          cashTarget={selectedScenario.cashTarget}
          onClose={() => setOpenMonth(null)}
          onStep={(delta) => {
            const next = detail.timelineMonth + delta;
            if (next >= 0 && next < result.months.length) setOpenMonth(next);
          }}
          isFirst={detail.timelineMonth === 0}
          isLast={detail.timelineMonth === result.months.length - 1}
        />
      )}
    </div>
  );
}

function ColGroupHead({ span, label, tone = 'neutral' }: { span: number; label: string; tone?: Tone }) {
  const colors: Record<Tone, string> = {
    neutral: 'text-muted',
    brand: 'text-brand',
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
    debt: 'text-debt',
  };
  return (
    <th
      colSpan={span}
      className={cx(
        'border-b border-l border-line bg-surface-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider',
        colors[tone],
      )}
    >
      {label}
    </th>
  );
}

function Th({ children, right, strong }: { children?: React.ReactNode; right?: boolean; strong?: boolean }) {
  return (
    <th
      className={cx(
        'border-b border-line bg-surface-2 px-3 pb-2 text-xs font-medium whitespace-nowrap',
        right ? 'text-right' : 'text-left',
        strong ? 'text-ink-2' : 'text-muted',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  tone,
  strong,
  className,
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'debt' | 'bad' | 'good';
  strong?: boolean;
  className?: string;
}) {
  const tones = {
    muted: 'text-ink-2',
    debt: 'text-debt',
    bad: 'text-bad',
    good: 'text-good',
  } as const;
  return (
    <td
      className={cx(
        'num px-3 py-2 text-right tabular-nums whitespace-nowrap',
        tone && tones[tone],
        strong && 'font-semibold text-ink',
        className,
      )}
    >
      {children}
    </td>
  );
}

function targetStatusChip(month: MonthRow) {
  if (month.cashTargetStatus === 'BUILD') return <Chip tone="neutral">Build</Chip>;
  if (month.cashTargetStatus === 'BELOW') return <Chip tone="warn">Below</Chip>;
  if (month.cashTargetStatus === 'AT') return <Chip tone="good">At target</Chip>;
  return <Chip tone="good">Above</Chip>;
}

function MonthTableRow({
  month,
  anchorMonth,
  onOpen,
}: {
  month: MonthRow;
  anchorMonth: string;
  onOpen: () => void;
}) {
  const sweep = month.extraDebtPayment > 0;
  return (
    <tr
      onClick={onOpen}
      className={cx(
        'cursor-pointer border-b border-line last:border-0 hover:bg-surface-2',
        month.operatingMonth === 0 && 'bg-surface-2/50',
        sweep && 'bg-brand-soft/40',
      )}
    >
      <th className="sticky-col border-r border-line px-3 py-2 text-left font-medium whitespace-nowrap">
        <div className="text-[14px] text-ink">{monthLabel(anchorMonth, month.timelineMonth)}</div>
        <div className="text-[11px] text-muted">{shortMonthTag(month.timelineMonth, month.operatingMonth)}</div>
      </th>
      <td className="px-3 py-2 text-[13px] text-muted">{month.phase}</td>
      <Td tone="muted">{month.operatingMonth || '—'}</Td>
      <Td>{formatNumber(month.totalMembers)}</Td>

      <Td tone="good">{formatCurrency(month.membershipCashIn)}</Td>
      <Td tone="good">{formatCurrency(month.otherCashIn)}</Td>
      <Td tone="good">{formatCurrency(month.startupVatRefund)}</Td>
      <Td strong>{formatCurrency(month.totalCashIn)}</Td>

      <Td tone="muted">{formatCurrency(month.operatingCashOut)}</Td>
      <Td tone="muted">{formatCurrency(month.regularDebtPayment)}</Td>
      <Td tone="debt" className={sweep ? 'font-semibold' : undefined}>
        {formatCurrency(month.extraDebtPayment)}
      </Td>
      <Td tone="muted">{formatCurrency(month.corporateTax)}</Td>
      <Td tone="muted">{formatCurrency(month.partner1Gross)}</Td>
      <Td tone="muted">{formatCurrency(month.partner2Gross)}</Td>
      <Td tone="muted">{formatCurrency(month.employerCosts)}</Td>
      <Td strong>{formatCurrency(month.totalCashOut)}</Td>

      <Td tone={month.netCashChange < 0 ? 'bad' : 'good'} strong={false} className="font-semibold">
        {formatCurrency(month.netCashChange)}
      </Td>
      <Td tone="muted">{formatCurrency(month.openingCash)}</Td>
      <Td strong className={month.endingCash < 0 ? '!text-bad' : undefined}>
        {formatCurrency(month.endingCash)}
      </Td>
      <Td tone="debt">{formatCurrency(month.debtRemaining)}</Td>
      <td className="px-3 py-2 text-right">{targetStatusChip(month)}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex gap-1">
          {month.events
            .filter((e) => e !== 'BUILD')
            .map((event) => (
              <Chip key={event} tone={EVENT_TONE[event]}>
                {event}
              </Chip>
            ))}
        </div>
      </td>
    </tr>
  );
}

function MonthMobileCard({
  month,
  anchorMonth,
  onOpen,
}: {
  month: MonthRow;
  anchorMonth: string;
  onOpen: () => void;
}) {
  const sweep = month.extraDebtPayment > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        'block w-full rounded-2xl border border-line bg-surface p-4 text-left transition active:scale-[0.995]',
        sweep && 'border-debt/40 bg-brand-soft/40',
        month.endingCash < 0 && 'border-bad/50 bg-bad-soft/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-semibold text-ink">
            {monthLabel(anchorMonth, month.timelineMonth)}
          </div>
          <div className="text-[13px] text-muted">
            {monthDescription(month.timelineMonth, month.operatingMonth)}
            {month.operatingMonth > 0 && ` · ${formatNumber(month.totalMembers)} members`}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {targetStatusChip(month)}
          {month.events
            .filter((e) => e !== 'BUILD' && e !== 'FUNDING')
            .slice(0, 1)
            .map((event) => (
              <Chip key={event} tone={EVENT_TONE[event]}>
                {event}
              </Chip>
            ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">In</div>
          <div className="num text-[16px] font-semibold tabular-nums text-good">
            {formatCurrency(month.totalCashIn)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Out</div>
          <div className="num text-[16px] font-semibold tabular-nums text-ink-2">
            {formatCurrency(month.totalCashOut)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Bank</div>
          <div
            className={cx(
              'num text-[16px] font-semibold tabular-nums',
              month.endingCash < 0 ? 'text-bad' : 'text-ink',
            )}
          >
            {formatCurrency(month.endingCash)}
          </div>
        </div>
      </div>

      {sweep && (
        <div className="mt-2.5 rounded-lg bg-surface-2 px-2.5 py-2 text-[13px] text-ink-2">
          {formatCurrency(month.extraDebtPayment)} intentionally sent to debt this month.
        </div>
      )}
    </button>
  );
}

/** Full-screen month detail — the mobile "tap a month" view, also used on desktop. */
function MonthDetail({
  month,
  anchorMonth,
  partner1,
  partner2,
  cashTarget,
  onClose,
  onStep,
  isFirst,
  isLast,
}: {
  month: MonthRow;
  anchorMonth: string;
  partner1: string;
  partner2: string;
  cashTarget: number;
  onClose: () => void;
  onStep: (delta: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const explanation = explainNetCashChange(month, formatCurrency);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail for ${monthLabel(anchorMonth, month.timelineMonth)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {monthLabel(anchorMonth, month.timelineMonth)}
            </h2>
            <p className="text-sm text-muted">
              {monthDescription(month.timelineMonth, month.operatingMonth)} · timeline month{' '}
              {month.timelineMonth}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} title="Close">
            ✕
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {month.events.map((event) => (
            <Chip key={event} tone={EVENT_TONE[event]}>
              {event}
            </Chip>
          ))}
          {targetStatusChip(month)}
        </div>

        {explanation && (
          <div className="mt-4">
            <Callout tone={month.extraDebtPayment > 0 ? 'brand' : 'warn'}>{explanation}</Callout>
          </div>
        )}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-good">Cash in</h3>
            <div className="mt-1">
              <DataRow label="Membership collected" value={formatCurrency(month.membershipCashIn)} />
              <DataRow label="Other income" value={formatCurrency(month.otherCashIn)} />
              <DataRow label="Startup VAT refund" value={formatCurrency(month.startupVatRefund)} />
              <DataRow label="Total cash in" value={formatCurrency(month.totalCashIn)} emphasis />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-bad">Cash out</h3>
            <div className="mt-1">
              <DataRow label="Operating cash out" value={formatCurrency(month.operatingCashOut)} />
              <DataRow label="Loan payment" value={formatCurrency(month.regularDebtPayment)} />
              <DataRow
                label="Extra debt payment"
                value={formatCurrency(month.extraDebtPayment)}
                tone={month.extraDebtPayment > 0 ? 'debt' : 'neutral'}
              />
              <DataRow label="Corporate tax" value={formatCurrency(month.corporateTax)} />
              <DataRow label={`${partner1} gross`} value={formatCurrency(month.partner1Gross)} />
              <DataRow label={`${partner2} gross`} value={formatCurrency(month.partner2Gross)} />
              <DataRow label="Employer costs" value={formatCurrency(month.employerCosts)} />
              <DataRow label="Total owner payroll" value={formatCurrency(month.ownerPayrollTotal)} />
              <DataRow label="Total cash out" value={formatCurrency(month.totalCashOut)} emphasis />
            </div>
          </section>
        </div>

        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <DataRow label="Opening bank cash" value={formatCurrency(month.openingCash)} />
          <DataRow
            label="Net cash change"
            value={formatCurrency(month.netCashChange)}
            tone={month.netCashChange < 0 ? 'bad' : 'good'}
          />
          <DataRow
            label="Ending bank cash"
            value={formatCurrency(month.endingCash)}
            emphasis
            tone={month.endingCash < 0 ? 'bad' : 'neutral'}
          />
          <DataRow
            label={`Against the ${formatCurrency(cashTarget)} target`}
            value={formatCurrency(month.endingCash - cashTarget)}
            tone={month.endingCash - cashTarget < 0 ? 'warn' : 'good'}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-debt">Debt</h3>
            <DataRow label="Loan A — 0%" value={formatCurrency(month.loanABalance)} />
            <DataRow label="Loan B — Prime" value={formatCurrency(month.loanBBalance)} />
            <DataRow label="Interest this month" value={formatCurrency(month.loanBInterest)} />
            <DataRow label="Total debt remaining" value={formatCurrency(month.debtRemaining)} emphasis />
          </div>
          <div className="rounded-2xl border border-line p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
              Accounting detail
            </h3>
            <DataRow label="Members" value={formatNumber(month.totalMembers)} />
            <DataRow label="Net revenue ex VAT" value={formatCurrency(month.netRevenueExVat)} />
            <DataRow label="Card fees" value={formatCurrency(month.cardFeesExVat)} />
            <DataRow label="Core opex ex VAT" value={formatCurrency(month.coreOpexExVat)} />
            <DataRow label="EBITDA" value={formatCurrency(month.ebitda)} />
            <DataRow
              label="Depreciation (non-cash)"
              value={formatCurrency(month.depreciation)}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button onClick={() => onStep(-1)} disabled={isFirst}>
            ← Previous
          </Button>
          <Button onClick={() => onStep(1)} disabled={isLast}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
