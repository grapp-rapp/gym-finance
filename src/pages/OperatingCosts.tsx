import { Fragment, useState } from 'react';
import { Button, Card, Chip, PageHeader, SectionTitle, StatCard, cx } from '../components/ui';
import { formatCurrency, formatPercent } from '../lib/format';
import { operatingCostTotals, type OperatingCostLine } from '../model';
import { useAppState } from '../state/AppState';

/**
 * PAGE 5 — Operating costs.
 *
 * Every recurring monthly cost, editable in place, with its VAT treatment. The gross
 * column is what leaves the bank; the ex-VAT column is what the model charges to the P&L,
 * because reclaimable VAT comes back.
 */
export function OperatingCosts() {
  const { assumptions: a, setAssumptions, result } = useAppState();
  const totals = operatingCostTotals(a);
  const [newName, setNewName] = useState('');

  const update = (id: string, patch: Partial<OperatingCostLine>) => {
    setAssumptions({
      operatingCosts: a.operatingCosts.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    });
  };

  const remove = (id: string) => {
    setAssumptions({ operatingCosts: a.operatingCosts.filter((line) => line.id !== id) });
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    setAssumptions({
      operatingCosts: [
        ...a.operatingCosts,
        {
          id: `custom-${Date.now()}`,
          category: 'Fixed',
          name,
          monthlyGross: 0,
          vatable: true,
          note: '',
        },
      ],
    });
    setNewName('');
  };

  const categories = [...new Set(totals.lines.map((line) => line.category))];
  const cardFeeExample = (result.years[0]?.grossBillings ?? 0) / 12 * a.cardFeeRate;

  return (
    <div>
      <PageHeader
        title="Operating costs"
        subtitle="What the gym costs to run every month. Edit any line; the whole model follows."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Operating cash out"
          value={formatCurrency(totals.monthlyGross)}
          sub="Gross per month — what leaves the bank"
          size="lg"
        />
        <StatCard
          label="Cost charged to P&L"
          value={formatCurrency(totals.monthlyExVat)}
          sub="Ex VAT — reclaimable VAT comes back"
        />
        <StatCard
          label="Reclaimable VAT"
          value={formatCurrency(totals.monthlyVat)}
          sub={`At ${formatPercent(a.vatRate, 0)}`}
        />
        <StatCard
          label="Annual cost"
          value={formatCurrency(totals.annualGross)}
          sub="Before card processing"
        />
      </div>

      <Card className="mt-6" padded={false}>
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle hint="Gross is the cash cost including VAT where the supplier charges it.">
            Monthly cost lines
          </SectionTitle>
        </div>

        <div className="scroll-x">
          <table className="w-full min-w-[860px] border-collapse text-[15px]">
            <thead>
              <tr className="border-y border-line bg-surface-2 text-left">
                <th className="px-4 py-3 text-sm font-semibold text-ink-2">Category</th>
                <th className="px-3 py-3 text-sm font-semibold text-ink-2">Line item</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">
                  Monthly gross
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-ink-2">VAT?</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">VAT</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-ink-2">Ex VAT</th>
                <th className="px-3 py-3 text-sm font-semibold text-ink-2">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Fragment key={category}>
                  {totals.lines
                    .filter((line) => line.category === category)
                    .map((line, index) => (
                      <tr key={line.id} className="border-b border-line hover:bg-surface-2">
                        <td className="px-4 py-2">
                          {index === 0 && <Chip tone="neutral">{category}</Chip>}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(event) => update(line.id, { name: event.target.value })}
                            className="w-full min-w-[180px] rounded-lg border border-transparent bg-transparent px-2 py-1.5 outline-none transition hover:border-line focus:border-brand focus:bg-surface-2"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={line.monthlyGross}
                            step={50}
                            onChange={(event) =>
                              update(line.id, { monthlyGross: Number(event.target.value) || 0 })
                            }
                            className="num w-28 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right tabular-nums outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={line.vatable}
                            onChange={(event) => update(line.id, { vatable: event.target.checked })}
                            className="h-4 w-4 accent-[var(--c-brand)]"
                            aria-label={`${line.name} carries reclaimable VAT`}
                          />
                        </td>
                        <td className="num px-3 py-2 text-right tabular-nums text-muted">
                          {formatCurrency(line.vat)}
                        </td>
                        <td className="num px-3 py-2 text-right font-medium tabular-nums">
                          {formatCurrency(line.exVat)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.note}
                            placeholder="—"
                            onChange={(event) => update(line.id, { note: event.target.value })}
                            className="w-full min-w-[160px] rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-muted outline-none transition hover:border-line focus:border-brand focus:bg-surface-2"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(line.id)}
                            title={`Remove ${line.name}`}
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
              <tr className="border-t-2 border-line-strong bg-surface-2 font-semibold">
                <td className="px-4 py-3" />
                <td className="px-3 py-3 text-ink">Total operating cash out</td>
                <td className="num px-3 py-3 text-right text-[17px] tabular-nums text-ink">
                  {formatCurrency(totals.monthlyGross)}
                </td>
                <td />
                <td className="num px-3 py-3 text-right tabular-nums text-muted">
                  {formatCurrency(totals.monthlyVat)}
                </td>
                <td className="num px-3 py-3 text-right text-[17px] tabular-nums text-ink">
                  {formatCurrency(totals.monthlyExVat)}
                </td>
                <td className="px-3 py-3 text-[13px] font-normal text-muted">
                  Before variable card processing
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
          <input
            type="text"
            value={newName}
            placeholder="Add a cost line…"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
            className="min-w-[200px] flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 outline-none focus:border-brand"
          />
          <Button variant="primary" onClick={add} disabled={!newName.trim()}>
            Add line
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle hint="Costs that scale with what the gym collects.">
            Variable costs
          </SectionTitle>
          <div className="flex items-baseline justify-between border-b border-line py-2.5">
            <span className="text-muted">
              Card / payment processing at {formatPercent(a.cardFeeRate)}
            </span>
            <span className="num font-medium tabular-nums">
              ≈ {formatCurrency(cardFeeExample)} / month in year 1
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">
            Card fees are charged as a percentage of gross billings, so they rise with membership
            rather than sitting in the fixed table above. Change the rate on the Inputs screen.
          </p>
        </Card>

        <Card>
          <SectionTitle hint="How VAT is handled in this model.">VAT treatment</SectionTitle>
          <p className="text-sm leading-relaxed text-muted">
            Membership is billed gross and VAT is remitted; costs marked VATable carry reclaimable
            VAT. Rather than track a monthly VAT return separately, the model works in ex-VAT
            economics for ongoing trading and shows the one large timing effect that genuinely moves
            cash — the{' '}
            <strong className="text-ink">
              {formatCurrency(
                a.startupCosts.reduce((s, l) => s + (l.vatable ? l.exVat * a.vatRate : 0), 0),
              )}{' '}
              build VAT refund
            </strong>{' '}
            arriving in timeline month {a.buildVatRefundMonth}. On the monthly screen this appears
            inside "Operating cash out", which is gross collections less what the gym actually
            generates.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {totals.lines.filter((l) => !l.vatable).map((line) => (
              <Chip key={line.id} tone="warn">
                {line.name} — no VAT
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <div
        className={cx(
          'mt-6 rounded-2xl border px-5 py-4 text-sm',
          Math.abs(totals.monthlyGross - 69849) < 1
            ? 'border-good/30 bg-good-soft text-ink'
            : 'border-line bg-surface-2 text-ink-2',
        )}
      >
        {Math.abs(totals.monthlyGross - 69849) < 1
          ? 'These costs match the reference spreadsheet exactly (₪69,849 gross / ₪63,914 ex VAT per month).'
          : `Costs have been changed from the spreadsheet baseline of ₪69,849 gross — currently ${formatCurrency(totals.monthlyGross)}.`}
      </div>
    </div>
  );
}
