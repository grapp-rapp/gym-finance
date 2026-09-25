import { useMemo, useState } from 'react';
import referenceValues from '../model/__fixtures__/reference-values.json';
import { Callout, Card, Chip, PageHeader, SectionTitle, Segmented, StatCard, cx } from '../components/ui';
import { formatCurrencyExact } from '../lib/format';
import {
  WORKBOOK_ASSUMPTIONS,
  WORKBOOK_SCENARIOS,
  PARITY_TOLERANCE,
  buildReconciliation,
  summariseReconciliation,
  type ReconciliationRow,
  type ReferenceValues,
} from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 8 — Spreadsheet reconciliation.
 *
 * Spreadsheet value, app value, difference — for every key output. This is the evidence
 * that the model was re-implemented rather than transcribed, and it is also a live check:
 * switch to "current inputs" to see exactly how far your edits have moved the plan.
 */
type Basis = 'defaults' | 'current';

export function Reconciliation() {
  const { assumptions, scenarios, isModified } = useAppState();
  const [basis, setBasis] = useState<Basis>('defaults');

  const rows = useMemo(
    () =>
      basis === 'defaults'
        ? buildReconciliation(referenceValues as unknown as ReferenceValues, WORKBOOK_ASSUMPTIONS, WORKBOOK_SCENARIOS)
        : buildReconciliation(referenceValues as unknown as ReferenceValues, assumptions, scenarios),
    [basis, assumptions, scenarios],
  );

  const summary = useMemo(() => summariseReconciliation(rows), [rows]);
  const groups = useMemo(() => {
    const map = new Map<string, ReconciliationRow[]>();
    for (const row of rows) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return [...map.entries()];
  }, [rows]);

  const allMatch = summary.mismatched === 0;

  return (
    <div>
      <PageHeader
        title="Spreadsheet reconciliation"
        subtitle="Every key output of this app compared against the value the reference workbook produced."
        actions={
          <Segmented<Basis>
            value={basis}
            onChange={setBasis}
            options={[
              { value: 'defaults', label: 'Spreadsheet defaults' },
              { value: 'current', label: 'Your current inputs' },
            ]}
          />
        }
      />

      <div className="mb-5">
        {basis === 'defaults' ? (
          allMatch ? (
            <Callout tone="good" title="Full parity with the spreadsheet">
              All {summary.total} checked outputs match. The largest difference anywhere is{' '}
              <strong className="num">{summary.worstDifference.toExponential(2)}</strong> — smaller
              than the workbook's own storage precision, which keeps about ten significant digits.
            </Callout>
          ) : (
            <Callout tone="bad" title={`${summary.mismatched} outputs do not match`}>
              These need investigating before the model can be trusted.
            </Callout>
          )
        ) : (
          <Callout tone={isModified ? 'warn' : 'brand'}>
            {isModified
              ? 'Showing the model with your edited inputs against the original spreadsheet values. Differences here are the effect of your changes, not errors.'
              : 'Your plan uses the current app defaults, including 360 launch members. The historical workbook starts at 238; differences are expected.'}
          </Callout>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Outputs checked" value={String(summary.total)} size="lg" />
        <StatCard
          label="Matched"
          value={String(summary.matched)}
          tone={allMatch ? 'good' : 'neutral'}
          size="lg"
        />
        <StatCard
          label="Differences"
          value={String(summary.mismatched)}
          tone={summary.mismatched === 0 ? 'good' : 'bad'}
          size="lg"
        />
        <StatCard
          label="Largest difference"
          value={summary.worstDifference.toExponential(2)}
          sub={summary.worstMetric}
          tone={summary.worstDifference <= PARITY_TOLERANCE ? 'good' : 'bad'}
        />
      </div>

      <div className="mt-6 space-y-4">
        {groups.map(([group, groupRows]) => {
          const groupMismatches = groupRows.filter((r) => !r.match).length;
          return (
            <Card key={group} padded={false}>
              <div className="px-5 pt-5 sm:px-6">
                <SectionTitle
                  right={
                    <Chip tone={groupMismatches === 0 ? 'good' : 'bad'}>
                      {groupMismatches === 0 ? 'All match' : `${groupMismatches} differ`}
                    </Chip>
                  }
                >
                  {group}
                </SectionTitle>
              </div>
              <div className="scroll-x">
                <table className="w-full min-w-[820px] border-collapse text-[14px]">
                  <thead>
                    <tr className="border-y border-line bg-surface-2 text-left">
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        Metric
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                        Spreadsheet
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                        App
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                        Difference
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        Source cell
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr
                        key={`${row.group}-${row.metric}`}
                        className={cx(
                          'border-b border-line last:border-0 hover:bg-surface-2',
                          !row.match && 'bg-bad-soft/40',
                        )}
                      >
                        <td className="px-4 py-2 text-ink">{row.metric}</td>
                        <td className="num px-3 py-2 text-right tabular-nums text-muted">
                          {renderValue(row.spreadsheet, row.unit)}
                        </td>
                        <td className="num px-3 py-2 text-right font-medium tabular-nums text-ink">
                          {renderValue(row.app, row.unit)}
                        </td>
                        <td
                          className={cx(
                            'num px-3 py-2 text-right tabular-nums',
                            row.match ? 'text-good' : 'font-semibold text-bad',
                          )}
                        >
                          {row.difference === null
                            ? row.match
                              ? 'match'
                              : 'differs'
                            : row.difference === 0
                              ? '0'
                              : row.difference.toExponential(2)}
                        </td>
                        <td className="px-4 py-2 font-mono text-[12px] text-muted">{row.cell}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <SectionTitle hint="How this check is produced.">Method</SectionTitle>
        <ul className="space-y-2 text-[15px] leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">The workbook is parsed, not transcribed.</strong>{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">
              npm run extract
            </code>{' '}
            unzips the .xlsx and reads the computed value out of every relevant cell. No number in
            the reference set was typed by hand.
          </li>
          <li>
            <strong className="text-ink">The formulas are re-implemented.</strong> The calculation
            layer computes members, revenue, VAT, loan amortisation, tax loss carry-forward, debt
            sweeps and owner payroll from first principles — it does not read the fixture at runtime.
          </li>
          <li>
            <strong className="text-ink">The test suite compares all of it.</strong>{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">npm test</code>{' '}
            checks 63 months × 22 columns for every scenario, plus the base case and the contractual
            loan schedule — roughly 8,000 individual cell comparisons.
          </li>
          <li>
            <strong className="text-ink">Tolerance is {PARITY_TOLERANCE}.</strong> The workbook
            stores computed values to about ten significant digits, so a balance of ₪1,105,309.8385
            comes back as 1105309.839. Half a cent covers that and nothing more.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function renderValue(value: number | string, unit: ReconciliationRow['unit']): string {
  if (typeof value !== 'number') return String(value);
  if (unit === 'month') return `Month ${value}`;
  if (unit === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (unit === 'text') return String(value);
  return formatCurrencyExact(value);
}
