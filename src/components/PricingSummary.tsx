import { Card, DataRow, SectionTitle } from './ui';
import { blendedMembershipFee, type Assumptions } from '../model';
import { formatCurrencyExact } from '../lib/format';
export function PricingSummary({ a }: { a: Assumptions }) {
  return <Card className="mt-6">
    <SectionTitle hint="All prices are gross including VAT. Recurring mix is measured in people.">Membership products</SectionTitle>
    <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
      <DataRow label="Standard Membership" value={`${formatCurrencyExact(a.priceStandard)} / month`} />
      <DataRow label="Soldier / Student" value={`${formatCurrencyExact(a.priceSoldier)} / month`} />
      <DataRow label="Couple · two people" value={`${formatCurrencyExact(a.priceCouple)} / couple`} />
      <DataRow label="One Month" value={formatCurrencyExact(a.priceOneMonth)} />
      <DataRow label="Day Pass" value={`${formatCurrencyExact(a.priceDayPass)} / visit`} />
      <DataRow label="Recurring blended gross / member" value={formatCurrencyExact(blendedMembershipFee(a))} emphasis />
    </div>
    <p className="mt-3 text-sm text-muted">Couple members contribute {formatCurrencyExact(a.priceCouple / 2)} each. One-month sales ({a.oneMonthPassesPerMonth}/month) and day-pass visits ({a.dayPassesPerMonth}/month) are separate from the recurring blend.</p>
  </Card>;
}
