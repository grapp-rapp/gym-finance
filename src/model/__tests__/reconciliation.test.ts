import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import referenceValues from '../__fixtures__/reference-values.json';
import {
  buildReconciliation,
  reconciliationMarkdown,
  summariseReconciliation,
  PARITY_TOLERANCE,
} from '../reconcile';
import type { ReferenceValues } from '../reconcile';

/**
 * The reconciliation report is the deliverable the brief asks for:
 * spreadsheet value, app value, difference — for every key output.
 * This test fails the build if any material discrepancy appears.
 */
describe('Reconciliation report', () => {
  const rows = buildReconciliation(referenceValues as unknown as ReferenceValues);
  const summary = summariseReconciliation(rows);

  it('prints the full report', () => {
    const width = { metric: 44, value: 18 };
    const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
    const num = (v: number | string) =>
      typeof v === 'number'
        ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(v);

    const lines: string[] = [];
    let group = '';
    for (const r of rows) {
      if (r.group !== group) {
        group = r.group;
        lines.push('');
        lines.push(`── ${group} ${'─'.repeat(Math.max(0, 72 - group.length))}`);
        lines.push(
          `${pad('  Metric', width.metric)}${pad('Spreadsheet', width.value)}${pad('App', width.value)}${pad('Difference', 14)}`,
        );
      }
      lines.push(
        `${pad('  ' + r.metric, width.metric)}` +
          `${pad(num(r.spreadsheet), width.value)}` +
          `${pad(num(r.app), width.value)}` +
          `${pad(r.difference === null ? (r.match ? 'match' : 'DIFFERS') : r.difference.toFixed(6), 14)}` +
          `${r.match ? '' : '   <-- MISMATCH'}`,
      );
    }
    lines.push('');
    lines.push(
      `Checked ${summary.total} outputs · ${summary.matched} matched · ${summary.mismatched} mismatched`,
    );
    lines.push(
      `Largest difference: ${summary.worstDifference.toExponential(3)} (${summary.worstMetric})`,
    );
    lines.push(`Tolerance: ${PARITY_TOLERANCE} — the workbook stores ~10 significant digits.`);
    console.log(lines.join('\n'));

    expect(rows.length).toBeGreaterThan(80);
  });

  it('has zero material discrepancies', () => {
    const mismatches = rows
      .filter((r) => !r.match)
      .map((r) => `${r.group} · ${r.metric}: sheet=${r.spreadsheet} app=${r.app} (${r.cell})`);
    expect(mismatches.join('\n')).toBe('');
  });

  it('largest difference is inside spreadsheet storage rounding', () => {
    expect(summary.worstDifference).toBeLessThanOrEqual(PARITY_TOLERANCE);
  });

  // `npm run reconcile` sets this; a plain `npm test` never writes to the working tree.
  it.runIf(process.env.RECONCILE_REPORT === '1')('writes RECONCILIATION.md', () => {
    const markdown = reconciliationMarkdown(
      rows,
      summary,
      (referenceValues as unknown as { meta: { source: string } }).meta.source,
      new Date().toISOString().slice(0, 10),
    );
    writeFileSync('RECONCILIATION.md', markdown);
    console.log(
      `Wrote RECONCILIATION.md — ${summary.matched}/${summary.total} matched, ` +
        `largest difference ${summary.worstDifference.toExponential(3)}`,
    );
  });
});
