import { acquisitionGrowth, acquisitionRevenue, ACQUISITION_GROWTH_TARGETS } from '../model';
import { formatCurrency, formatNumber, formatPercent } from '../lib/format';
import { useAppState } from '../state/AppState';
import { Button, Callout, Card, NumberField, SectionTitle, Toggle } from './ui';
import { MembersChart } from './charts';

export function AcquisitionGrowth({ editable = false, onEdit }: { editable?: boolean; onEdit?: () => void }) {
  const { assumptions: a, setAssumptions, result } = useAppState();
  const p = a.acquisition!, growth = acquisitionGrowth(p);
  const update = (patch: Partial<typeof growth>) => setAssumptions({ acquisition: { ...p, growth: { ...growth, ...patch } } });
  const months = Array.from({ length: 60 }, (_, i) => acquisitionRevenue(a, i + 1));
  const firstYearSignups = months.slice(0, 12).reduce((s, m) => s + m.signups, 0);
  return <Card>
    <SectionTitle right={onEdit && <Button size="sm" variant="secondary" onClick={onEdit}>Edit growth targets</Button>}>Membership growth · year-one push</SectionTitle>
    <p className="mb-4 text-sm text-muted">Start with {formatNumber(a.currentMembers)} people at takeover. Push for growth in year one, then follow more modest annual targets. These are sales goals, not guaranteed demand.</p>
    {editable && <>
      <Toggle label="Use year-end member targets" checked={growth.enabled} onChange={enabled => update({ enabled })} description="The model calculates the signups needed after retention losses and churn. Switch off to use manual monthly signups and revenue growth instead." />
      <div className="my-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <NumberField label="People at takeover" value={a.currentMembers} onChange={currentMembers => setAssumptions({ currentMembers: Math.round(currentMembers) })} min={0} />
        {growth.yearEndTargets.map((target, i) => <NumberField key={i} label={`Year ${i + 1} ending members`} value={target} min={0} max={1000000} disabled={!growth.enabled} onChange={value => {
          const yearEndTargets = [...growth.yearEndTargets] as typeof growth.yearEndTargets;
          yearEndTargets[i] = Math.round(value);
          update({ yearEndTargets });
        }} />)}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => update({ enabled: true, yearEndTargets: [...ACQUISITION_GROWTH_TARGETS] })}>Suggested · 450 / 550 / 650 / 725 / 800</Button>
        <Button size="sm" variant="secondary" onClick={() => update({ enabled: true, yearEndTargets: [...a.yearEndTargets] })}>Use original five-year targets</Button>
        <Button size="sm" variant="secondary" onClick={() => setAssumptions({ acquisition: { ...p, growth: { ...growth, enabled: false }, newMembersPerMonth: 0, annualRevenueGrowth: 0 } })}>No-growth stress test</Button>
      </div>
    </>}
    {!growth.enabled && <Callout tone="warn" title="Annual member targets are off">The forecast currently uses {formatNumber(p.newMembersPerMonth, { showZero: true })} new members per month and {formatPercent(p.annualRevenueGrowth)} annual growth in existing collections. Enable targets to use the year-one growth push.</Callout>}
    {growth.enabled && growth.yearEndTargets.some(t => t > a.capacity) && <Callout tone="warn" title="Some targets exceed capacity">The forecast caps membership at {formatNumber(a.capacity)} people. Reduce the targets or update capacity if the premises can support more people.</Callout>}
    <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
      <thead><tr>{['Year', 'Ending members', 'Net change', 'New signups / month', 'Year-end monthly collections'].map(x => <th key={x} scope="col" className="p-2 text-right text-muted">{x}</th>)}</tr></thead>
      <tbody>{[0, 1, 2, 3, 4].map(i => {
        const end = months[i * 12 + 11], start = i === 0 ? a.currentMembers : months[i * 12 - 1].members;
        const signups = months.slice(i * 12, i * 12 + 12).reduce((s, m) => s + m.signups, 0) / 12;
        const row = result.months.find(m => m.operatingMonth === (i + 1) * 12);
        const cash = row ? row.membershipCashIn + row.otherCashIn : 0;
        return <tr key={i} className="border-t border-line"><td className="p-2 text-right">{i + 1}</td><td className="num p-2 text-right">{formatNumber(end.members)}</td><td className="num p-2 text-right">{end.members - start >= 0 ? '+' : ''}{formatNumber(end.members - start, { showZero: true })}</td><td className="num p-2 text-right">~{signups.toFixed(1)}</td><td className="num p-2 text-right">{formatCurrency(cash)}</td></tr>;
      })}</tbody>
    </table></div>
    <p className="mt-3 text-sm text-muted">{growth.enabled ? `Year one needs approximately ${Math.ceil(firstYearSignups)} new signups in total, including replacements. Targets rise evenly from month 1 to month 12 and between later year ends. ` : ''}Existing-member retention follows the settings below; monthly churn applies to new members and renewed cohorts. New members pay the current recurring price mix. Day passes and one-month sales stay separate.</p>
    {growth.enabled && <p className="mt-2 text-sm text-muted">Manual monthly signups and annual revenue growth are paused while targets are on, so growth is counted once. The historical collections uplift still applies only to existing income. No automatic price increase is assumed.</p>}
    <div className="mt-4"><MembersChart months={result.months} capacity={a.capacity} /></div>
    <details className="mt-4 rounded-xl border border-line p-4"><summary className="cursor-pointer font-medium text-ink">Year-one monthly signup guide</summary>
      <p className="my-3 text-sm text-muted">Expected signups include replacing losses. Fractional values are planning averages; round up for a practical monthly sales goal. Month one starts at takeover membership.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Operating month', 'Active members', 'New signups needed', 'Membership cash in'].map(x => <th key={x} scope="col" className="p-2 text-right text-muted">{x}</th>)}</tr></thead><tbody>{months.slice(0, 12).map((m, i) => <tr key={i} className="border-t border-line"><td className="p-2 text-right">{i + 1}</td><td className="num p-2 text-right">{formatNumber(m.members)}</td><td className="num p-2 text-right">~{m.signups.toFixed(1)}</td><td className="num p-2 text-right">{formatCurrency(result.months.find(row => row.operatingMonth === i + 1)?.membershipCashIn)}</td></tr>)}</tbody></table></div>
    </details>
  </Card>;
}
