import { useMemo } from 'react';
import { equipmentAllocation, equipmentBudgetCase, type AcquisitionPlan } from '../model';
import { formatCurrency } from '../lib/format';
import { useAppState } from '../state/AppState';
import { Button, Callout, Card, DataRow, NumberField, SectionTitle, Toggle } from './ui';

export function EquipmentPlan({ editable = false }: { editable?: boolean }) {
  const { assumptions: a, setAssumptions, selectedScenario, result } = useAppState();
  const p = a.acquisition!, allocation = equipmentAllocation(p);
  const update = (patch: Partial<AcquisitionPlan>) => setAssumptions({ acquisition: { ...p, ...patch } });
  const chooseBudget = (gross: number) => setAssumptions({ sweepsEnabled: false, acquisition: {
    ...p, phase2Enabled: true, phase2Gross: gross, phase2MenGross: gross * (p.phase2Gross > 0 ? allocation.menGross / p.phase2Gross : .5), phase2GuardCash: true,
  } });
  const comparisons = useMemo(() => [0, 200000, 500000].map(gross => equipmentBudgetCase(a, selectedScenario, gross)), [a, selectedScenario]);
  const purchase = result.months.find(m => (m.capitalSpending ?? 0) > 0);
  return <Card>
    <SectionTitle>{editable ? '5 · Equipment for the men’s and women’s gyms' : 'Equipment first · scheduled debt payments'}</SectionTitle>
    <p className="mb-4 text-sm text-muted">The working plan is ₪200,000 combined equipment spending across both existing gyms. The ₪500,000 option is a full equipment alternative, in addition to the purchase and cosmetic work. These are alternative total budgets, not cumulative purchases.</p>
    <Callout tone={a.sweepsEnabled ? 'warn' : 'brand'} title={a.sweepsEnabled ? 'Extra debt sweeps are enabled' : 'Extra debt sweeps are paused'}>Scheduled loan payments continue after grace. Cash above the emergency target can accumulate for equipment. Buying equipment does not automatically increase the membership forecast.</Callout>
    {editable && <>
      <div className="my-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => chooseBudget(200000)}>Use ₪200,000 equipment plan</Button><Button size="sm" variant="secondary" onClick={() => chooseBudget(500000)}>Model ₪500,000 full equipment plan</Button></div>
      <Toggle label="Include equipment investment" checked={p.phase2Enabled} onChange={phase2Enabled => update({ phase2Enabled })} />
      <div className="my-4 grid gap-4 sm:grid-cols-3">
        <NumberField label="Combined equipment budget · gross" value={p.phase2Gross} min={0} prefix="₪" onChange={gross => update({ phase2Gross: gross, phase2MenGross: gross * (p.phase2Gross > 0 ? allocation.menGross / p.phase2Gross : .5) })} />
        <NumberField label="Men’s gym allocation · gross" value={allocation.menGross} min={0} max={p.phase2Gross} prefix="₪" onChange={phase2MenGross => update({ phase2MenGross })} />
        <NumberField label="Women’s gym allocation · gross" value={allocation.womenGross} min={0} max={p.phase2Gross} prefix="₪" onChange={women => update({ phase2MenGross: p.phase2Gross - women })} />
        <NumberField label="Earliest equipment operating month" value={p.phase2OperatingMonth} min={1} max={600} onChange={phase2OperatingMonth => update({ phase2OperatingMonth: Math.round(phase2OperatingMonth) })} />
        <NumberField label="Equipment VAT refund delay" value={p.phase2VatDelay} min={0} max={60} suffix="months" onChange={phase2VatDelay => update({ phase2VatDelay: Math.round(phase2VatDelay) })} />
      </div>
      <p className="text-sm text-muted">The initial split is 50/50, not a supplier quote. Change the total first; allocation changes redistribute that total between the gyms. This adds equipment to the existing two spaces; it does not add a second rent or staffing budget. Member targets and capacity remain combined across both gyms.</p>
      <Toggle label="Equipment purchase includes reclaimable VAT" checked={p.phase2Vatable} onChange={phase2Vatable => update({ phase2Vatable })} />
      <Toggle label="Wait until affordable" checked={p.phase2GuardCash} onChange={phase2GuardCash => update({ phase2GuardCash })} description="Require three completed positive trading months after scheduled debt, tax and owners; fund the full gross order and retain the cash target. VAT refunds arrive later. The combined order is paid once, not assumed to be staged or supplier-financed." />
      {!p.phase2GuardCash && <Callout tone="warn" title="Affordability check is off">The selected plan spends on the chosen month even if it uses the emergency cash or creates a funding gap. The comparisons below keep the affordability check on.</Callout>}
    </>}
    <div className="mt-4"><DataRow label="Selected combined budget" value={formatCurrency(p.phase2Gross)} /><DataRow label="Men’s / women’s allocation" value={`${formatCurrency(allocation.menGross)} / ${formatCurrency(allocation.womenGross)}`} /><DataRow label="Selected forecast purchase" value={!p.phase2Enabled ? 'Not included' : purchase ? `Operating month ${purchase.operatingMonth}` : 'Deferred — not funded in this forecast'} emphasis /></div>
    <SectionTitle>Compare ₪200k with ₪500k</SectionTitle>
    <p className="mb-3 text-sm text-muted">Same growth, prices, running costs, owner salaries and financing. All three comparisons use scheduled payments only and wait until the full order is affordable. No extra borrowing or equipment-driven sales are assumed.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Equipment total','Men / women','Purchase month','Year 1 bank','Year 5 bank','Debt left after 5 years','Extra cash to buy at takeover'].map(label => <th key={label} scope="col" className="p-2 text-right text-muted">{label}</th>)}</tr></thead><tbody>{comparisons.map(c => <tr key={c.gross} className="border-t border-line"><td className="num p-2 text-right">{c.gross === 0 ? 'No equipment' : formatCurrency(c.gross)}</td><td className="num p-2 text-right">{formatCurrency(c.allocation.menGross)} / {formatCurrency(c.allocation.womenGross)}</td><td className="p-2 text-right">{c.gross === 0 ? '—' : c.purchaseMonth ?? 'Deferred'}</td>{[c.result.years[0].endingCash, c.result.year5EndingCash, c.result.years.at(-1)?.debtRemaining ?? 0, c.extraUpfrontCash].map((value, i) => <td key={i} className="num p-2 text-right">{formatCurrency(value, { showZero: true })}</td>)}</tr>)}</tbody></table></div>
    <p className="mt-3 text-sm text-muted">“Extra cash at takeover” funds purchase, cosmetic work, the full equipment order and the cash target before future VAT credits; it is not automatically added to the forecast. A later purchase uses accumulated trading cash. The existing loan still follows its contractual term even if bank cash grows.</p>
    {!a.sweepsEnabled && a.loanAPrincipal + a.loanBPrincipal > 0 && <p className="mt-2 text-sm text-muted">Scheduled payoff is operating month {a.graceMonths + a.repaymentMonths} at the entered loan terms, assuming payments are funded and the rate stays unchanged. A debt balance may remain at the end of the five-year view.</p>}
  </Card>;
}
