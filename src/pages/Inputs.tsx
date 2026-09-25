import { PartnerSalaryFields } from '../components/PartnerSalaryFields';
import {
  Accordion,
  Button,
  Callout,
  Card,
  DataRow,
  NumberField,
  PageHeader,
  PercentField,
  TextField,
  Toggle,
} from '../components/ui';
import { formatCurrency, formatNumber, formatPercent } from '../lib/format';
import {
  blendedMembershipFee,
  loanTerms,
  operatingCostTotals,
  reopeningMembers,
  startupTotals,
} from '../model';
import { useAppState } from '../state/AppState';
import type { Route } from '../lib/router';

/**
 * PAGE 4 — Inputs.
 *
 * Every assumption in the model, in plain English, grouped and collapsible.
 * No spreadsheet cell references are exposed here — those live in the code comments
 * and the reconciliation report.
 */
export function Inputs({ navigate }: { navigate: (route: Route) => void }) {
  const {
    assumptions: a,
    setAssumptions,
    selectedScenario,
    setScenario,
    anchorMonth,
    setAnchorMonth,
    resetAll,
    isModified,
    result,
  } = useAppState();

  const opex = operatingCostTotals(a);
  const startup = startupTotals(a);
  const terms = loanTerms(a);
  const mixTotal = a.mixFullAccess + a.mixSingleService + a.mixSoldier;

  return (
    <div>
      <PageHeader
        title="Inputs"
        subtitle="Everything the model is built on. Change any number and the whole plan updates."
        actions={
          isModified && (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Reset all inputs, scenarios and actuals to the current app defaults?')) {
                  resetAll();
                }
              }}
            >
              Reset to app defaults
            </Button>
          )
        }
      />

      {isModified && (
        <div className="mb-5">
          <Callout tone="warn" title="You have changed the base assumptions">
            The model no longer matches the reference spreadsheet. Use the{' '}
            <button
              type="button"
              onClick={() => navigate('reconciliation')}
              className="font-medium underline underline-offset-2"
            >
              reconciliation report
            </button>{' '}
            to see the effect, or reset to the current app defaults.
          </Callout>
        </div>
      )}

      <div className="space-y-3">
        {/* --- Business ------------------------------------------------- */}
        <Accordion
          title="Business & timeline"
          summary={`${a.closureMonths}-month rebuild, then ${a.operatingMonths} operating months`}
          defaultOpen
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Rebuild / closure period"
              value={a.closureMonths}
              onChange={(closureMonths) => setAssumptions({ closureMonths })}
              suffix="months"
              min={0}
              max={24}
              hint="The gym is closed and collects nothing during these months."
            />
            <NumberField
              label="Operating months modelled"
              value={a.operatingMonths}
              onChange={(operatingMonths) => setAssumptions({ operatingMonths })}
              suffix="months"
              min={12}
              max={120}
            />
            <div>
              <label className="block text-sm font-medium text-ink-2" htmlFor="anchor-month">
                Funding month
              </label>
              <input
                id="anchor-month"
                type="month"
                value={anchorMonth}
                onChange={(event) => setAnchorMonth(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[16px] outline-none focus:border-brand"
              />
              <p className="mt-1 text-[13px] text-muted">
                Used only to label months with real dates.
              </p>
            </div>
            <TextField
              label="Partner 1 name"
              value={a.partner1Name}
              onChange={(partner1Name) => setAssumptions({ partner1Name })}
            />
            <TextField
              label="Partner 2 name"
              value={a.partner2Name}
              onChange={(partner2Name) => setAssumptions({ partner2Name })}
            />
            <PercentField
              label="Partner 1 ownership"
              value={a.partner1Share}
              onChange={(partner1Share) => setAssumptions({ partner1Share })}
              hint={`Partner 2 holds ${formatPercent(1 - a.partner1Share, 0)}.`}
              max={1}
            />
          </div>
        </Accordion>

        {/* --- Membership ----------------------------------------------- */}
        <Accordion
          title="Membership"
          summary={`${formatNumber(a.currentMembers)} today → ${formatNumber(reopeningMembers(a))} at reopening → ${formatNumber(a.yearEndTargets[4])} by year 5`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Historical members (reference only)"
              value={a.currentMembers}
              onChange={(currentMembers) => setAssumptions({ currentMembers })}
              suffix="members"
              min={0}
            />
            <NumberField label="Launch month members" value={a.launchMembers} onChange={(launchMembers) => setAssumptions({ launchMembers })} min={0} suffix="members" hint="Starting organic membership, growing toward the year-one target and capped by capacity." />
            <NumberField
              label="Planning capacity"
              value={a.capacity}
              onChange={(capacity) => setAssumptions({ capacity })}
              suffix="members"
              min={1}
              hint="Total membership can never exceed this."
            />
          </div>

          <h4 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            End-of-year member targets
          </h4>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {a.yearEndTargets.map((target, index) => (
              <NumberField
                key={index}
                label={`Year ${index + 1}`}
                value={target}
                onChange={(value) => {
                  const next = [...a.yearEndTargets] as typeof a.yearEndTargets;
                  next[index] = value;
                  setAssumptions({ yearEndTargets: next });
                }}
                suffix="members"
                min={0}
              />
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Months in between ramp linearly to each target. These are organic targets — Moatza is
            added on top, up to capacity.
          </p>
        </Accordion>

        {/* --- Pricing --------------------------------------------------- */}
        <Accordion
          title="Pricing & other income"
          summary={`Blended ${formatCurrency(blendedMembershipFee(a))} gross / member / month`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Full access — gym + classes"
              value={a.priceFullAccess}
              onChange={(priceFullAccess) => setAssumptions({ priceFullAccess })}
              prefix="₪"
              step={5}
            />
            <NumberField
              label="Single service — gym OR classes"
              value={a.priceSingleService}
              onChange={(priceSingleService) => setAssumptions({ priceSingleService })}
              prefix="₪"
              step={5}
            />
            <NumberField
              label="Soldier / student"
              value={a.priceSoldier}
              onChange={(priceSoldier) => setAssumptions({ priceSoldier })}
              prefix="₪"
              step={5}
            />
            <PercentField
              label="Full-access mix"
              value={a.mixFullAccess}
              onChange={(mixFullAccess) => setAssumptions({ mixFullAccess })}
              max={1}
            />
            <PercentField
              label="Single-service mix"
              value={a.mixSingleService}
              onChange={(mixSingleService) => setAssumptions({ mixSingleService })}
              max={1}
            />
            <PercentField
              label="Soldier mix"
              value={a.mixSoldier}
              onChange={(mixSoldier) => setAssumptions({ mixSoldier })}
              max={1}
            />
            <NumberField
              label="Other income"
              value={a.otherIncomeGross}
              onChange={(otherIncomeGross) => setAssumptions({ otherIncomeGross })}
              prefix="₪"
              step={100}
              hint="Partnerships, store, day passes — gross per month."
            />
            <PercentField
              label="Card / payment processing"
              value={a.cardFeeRate}
              onChange={(cardFeeRate) => setAssumptions({ cardFeeRate })}
              hint="Share of gross billings."
            />
            <PercentField
              label="Annual price increase"
              value={a.priceInflation}
              onChange={(priceInflation) => setAssumptions({ priceInflation })}
              hint="Applied at each operating-year boundary."
            />
          </div>
          {Math.abs(mixTotal - 1) > 0.0001 && (
            <div className="mt-4">
              <Callout tone="warn">
                The member mix adds up to {formatPercent(mixTotal)}, not 100%. The blended fee will
                be under- or overstated until this is corrected.
              </Callout>
            </div>
          )}
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <DataRow
              label="Blended membership fee"
              value={`${formatCurrency(blendedMembershipFee(a))} gross`}
              emphasis
            />
          </div>
        </Accordion>

        {/* --- Moatza --------------------------------------------------- */}
        <Accordion
          title="Moatza deal"
          summary={a.moatzaEnabled ? `ON — ${formatNumber(a.moatzaMembers)} members from op month ${a.moatzaStartMonth}` : 'OFF'}
        >
          <Toggle
            checked={a.moatzaEnabled}
            onChange={(moatzaEnabled) => setAssumptions({ moatzaEnabled })}
            label="Include the Moatza deal"
            description="Off by default. Moatza members are incremental until total membership hits capacity, after which they displace organic demand."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Moatza members"
              value={a.moatzaMembers}
              onChange={(moatzaMembers) => setAssumptions({ moatzaMembers })}
              suffix="members"
              min={0}
              disabled={!a.moatzaEnabled}
            />
            <NumberField
              label="Fee per Moatza member"
              value={a.moatzaFee}
              onChange={(moatzaFee) => setAssumptions({ moatzaFee })}
              prefix="₪"
              step={5}
              disabled={!a.moatzaEnabled}
            />
            <NumberField
              label="Starts — operating month"
              value={a.moatzaStartMonth}
              onChange={(moatzaStartMonth) => setAssumptions({ moatzaStartMonth })}
              min={1}
              max={60}
              disabled={!a.moatzaEnabled}
            />
          </div>
          {a.moatzaEnabled && (
            <div className="mt-4">
              <Callout tone="brand">
                With Moatza on, organic membership is capped at{' '}
                {formatNumber(Math.max(0, a.capacity - a.moatzaMembers))} so total membership stays
                within the {formatNumber(a.capacity)} capacity.
              </Callout>
            </div>
          )}
        </Accordion>

        {/* --- Operating costs ------------------------------------------ */}
        <Accordion
          title="Operating costs"
          summary={`${formatCurrency(opex.monthlyGross)} gross / month · ${formatCurrency(opex.monthlyExVat)} ex VAT`}
        >
          <p className="text-sm text-muted">
            Each cost line is editable on its own screen, with VAT treatment and notes.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <PercentField
              label="Annual cost inflation"
              value={a.opexInflation}
              onChange={(opexInflation) => setAssumptions({ opexInflation })}
            />
            <NumberField
              label="Cost per closure month"
              value={a.closureCostExVat}
              onChange={(closureCostExVat) => setAssumptions({ closureCostExVat })}
              prefix="₪"
              step={500}
              hint="Ex VAT, while the gym is shut."
            />
          </div>
          <div className="mt-4">
            <Button variant="primary" onClick={() => navigate('operating-costs')}>
              Edit the {a.operatingCosts.length} cost lines →
            </Button>
          </div>
        </Accordion>

        {/* --- Startup -------------------------------------------------- */}
        <Accordion
          title="Startup & build"
          summary={`${formatCurrency(startup.grossCash)} gross · ${formatCurrency(startup.cashAfterClosureAndRefund)} cash after build`}
        >
          <div className="scroll-x -mx-2">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-2 py-2 text-sm font-semibold text-ink-2">Item</th>
                  <th className="px-2 py-2 text-right text-sm font-semibold text-ink-2">Ex VAT</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-ink-2">VAT?</th>
                  <th className="px-2 py-2 text-right text-sm font-semibold text-ink-2">VAT</th>
                  <th className="px-2 py-2 text-right text-sm font-semibold text-ink-2">Gross cash</th>
                </tr>
              </thead>
              <tbody>
                {startup.lines.map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-0">
                    <td className="px-2 py-2">
                      <div className="text-ink">{line.name}</div>
                      {line.note && <div className="text-[12px] text-muted">{line.note}</div>}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={line.exVat}
                        onChange={(event) =>
                          setAssumptions({
                            startupCosts: a.startupCosts.map((item) =>
                              item.id === line.id
                                ? { ...item, exVat: Number(event.target.value) || 0 }
                                : item,
                            ),
                          })
                        }
                        className="num w-32 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right tabular-nums outline-none focus:border-brand"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={line.vatable}
                        onChange={(event) =>
                          setAssumptions({
                            startupCosts: a.startupCosts.map((item) =>
                              item.id === line.id ? { ...item, vatable: event.target.checked } : item,
                            ),
                          })
                        }
                        className="h-4 w-4 accent-[var(--c-brand)]"
                        aria-label={`${line.name} is VATable`}
                      />
                    </td>
                    <td className="num px-2 py-2 text-right tabular-nums text-muted">
                      {formatCurrency(line.vat)}
                    </td>
                    <td className="num px-2 py-2 text-right font-medium tabular-nums">
                      {formatCurrency(line.gross)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField
              label="VAT refund arrives — timeline month"
              value={a.buildVatRefundMonth}
              onChange={(buildVatRefundMonth) => setAssumptions({ buildVatRefundMonth })}
              min={0}
              max={12}
              hint="Critical liquidity assumption: when the build VAT actually comes back."
            />
            <div className="rounded-2xl bg-surface-2 p-4">
              <DataRow label="Total financing" value={formatCurrency(startup.totalFinancing)} />
              <DataRow label="Gross cash spent" value={formatCurrency(startup.grossCash)} />
              <DataRow label="Cash headroom at funding" value={formatCurrency(startup.cashHeadroom)} />
              <DataRow label="Closure period cost" value={formatCurrency(-startup.closureCost)} />
              <DataRow label="Build VAT refund" value={formatCurrency(startup.reclaimableVat)} />
              <DataRow
                label="Cash after build"
                value={formatCurrency(startup.cashAfterClosureAndRefund)}
                emphasis
              />
            </div>
          </div>
        </Accordion>

        <Card className="p-5"><NumberField label="Self-financing — owner funds" value={a.selfFinancing} onChange={(selfFinancing) => setAssumptions({ selfFinancing })} prefix="₪" min={0} hint="Upfront equity added to opening cash. Set both loans to zero for full self-financing." /></Card>
        <Accordion
          title="Funding — owner funds and loans"
          summary={`${formatCurrency(a.selfFinancing + a.loanAPrincipal + a.loanBPrincipal)} total · ${formatCurrency(terms.totalPayment)} / month after grace`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Loan A — interest free"
              min={0}
              value={a.loanAPrincipal}
              onChange={(loanAPrincipal) => setAssumptions({ loanAPrincipal })}
              prefix="₪"
              step={10000}
            />
            <NumberField
              label="Loan B — Prime linked"
              min={0}
              value={a.loanBPrincipal}
              onChange={(loanBPrincipal) => setAssumptions({ loanBPrincipal })}
              prefix="₪"
              step={10000}
            />
            <PercentField
              label="Bank of Israel rate"
              value={a.boiRate}
              onChange={(boiRate) => setAssumptions({ boiRate })}
            />
            <PercentField
              label="Prime spread"
              value={a.primeSpread}
              onChange={(primeSpread) => setAssumptions({ primeSpread })}
              hint={`Prime = ${formatPercent(terms.primeRate, 2)}`}
            />
            <NumberField
              label="Grace period"
              value={a.graceMonths}
              onChange={(graceMonths) => setAssumptions({ graceMonths })}
              suffix="months"
              min={0}
              hint="Free grace: no interest and no payments."
            />
            <NumberField
              label="Repayment term after grace"
              value={a.repaymentMonths}
              onChange={(repaymentMonths) => setAssumptions({ repaymentMonths })}
              suffix="months"
              min={1}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <DataRow label="Loan A payment" value={`${formatCurrency(terms.loanAPayment)} / month`} />
            <DataRow label="Loan B payment" value={`${formatCurrency(terms.loanBPayment)} / month`} />
            <DataRow
              label="Combined after grace"
              value={`${formatCurrency(terms.totalPayment)} / month`}
              emphasis
            />
            <DataRow
              label="Payments begin"
              value={`Timeline month ${terms.paymentStartTimelineMonth} · operating month ${terms.paymentStartOperatingMonth}`}
            />
          </div>
        </Accordion>

        {/* --- Tax / VAT ------------------------------------------------ */}
        <Accordion
          title="Tax & VAT"
          summary={`VAT ${formatPercent(a.vatRate, 0)} · corporate tax ${formatPercent(a.corporateTaxRate, 0)}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <PercentField
              label="VAT rate"
              value={a.vatRate}
              onChange={(vatRate) => setAssumptions({ vatRate })}
              decimals={0}
            />
            <PercentField
              label="Corporate tax rate"
              value={a.corporateTaxRate}
              onChange={(corporateTaxRate) => setAssumptions({ corporateTaxRate })}
              decimals={0}
            />
            <NumberField
              label="Monthly depreciation"
              value={a.monthlyDepreciation}
              onChange={(monthlyDepreciation) => setAssumptions({ monthlyDepreciation })}
              prefix="₪"
              step={100}
              hint="Tax deduction only — never reduces bank cash."
            />
          </div>
        </Accordion>

        {/* --- Cash target & sweeps ------------------------------------- */}
        <Accordion
          title="Cash target & debt sweeps"
          summary={`${formatCurrency(selectedScenario.cashTarget)} target · every ${selectedScenario.sweepFrequency} months from op ${selectedScenario.firstSweepMonth}`}
        >
          <Toggle
            checked={a.sweepsEnabled}
            onChange={(sweepsEnabled) => setAssumptions({ sweepsEnabled })}
            label="Pay debt down faster with spare cash"
            description="When on, cash above the target is used for lump-sum debt payments on the sweep schedule. Prime debt first, then the 0% loan."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Cash target"
              value={selectedScenario.cashTarget}
              onChange={(cashTarget) => setScenario(selectedScenario.id, { cashTarget })}
              prefix="₪"
              step={10000}
              min={0}
              hint="Emergency buffer within bank cash, not an expense or a second reserve. Debt sweeps only use cash above this target."
            />
            <PercentField
              label="Excess cash used at each sweep"
              value={a.sweepShareOfExcess}
              onChange={(sweepShareOfExcess) => setAssumptions({ sweepShareOfExcess })}
              decimals={0}
              max={1}
            />
            <NumberField
              label="First sweep — operating month"
              value={selectedScenario.firstSweepMonth}
              onChange={(firstSweepMonth) => setScenario(selectedScenario.id, { firstSweepMonth })}
              min={1}
              max={60}
            />
            <NumberField
              label="Sweep frequency"
              value={selectedScenario.sweepFrequency}
              onChange={(sweepFrequency) =>
                setScenario(selectedScenario.id, { sweepFrequency: Math.max(1, sweepFrequency) })
              }
              suffix="months"
              min={1}
              max={24}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <DataRow
              label="Total extra paid to debt over 5 years"
              value={formatCurrency(result.totalExtraDebtPrepayments)}
            />
            <DataRow label="Interest saved" value={formatCurrency(result.interestSaved)} tone="good" />
            <DataRow
              label="Debt cleared"
              value={
                result.debtFreeOperatingMonth === null
                  ? 'Beyond the modelled window'
                  : `Operating month ${result.debtFreeOperatingMonth} — ${result.monthsDebtEliminatedEarly} months early`
              }
              emphasis
            />
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Sweep timing and the cash target belong to the selected scenario, so different owner-pay
            plans can hold different amounts of cash. Edit the others in the Scenario Lab.
          </p>
        </Accordion>

        {/* --- Owner pay ------------------------------------------------ */}
        <Accordion
          title="Owner pay"
          summary={`${formatPercent(a.employerLoad, 0)} employer load · ${selectedScenario.name}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <PercentField
              label="Employer load on owner salary"
              value={a.employerLoad}
              onChange={(employerLoad) => setAssumptions({ employerLoad })}
              decimals={0}
            />
            <PartnerSalaryFields policy={selectedScenario} partner1={a.partner1Name} partner2={a.partner2Name} update={(update) => setScenario(selectedScenario.id, update)} />
          </div>
          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <DataRow
              label={`${a.partner1Name} gross`}
              value={formatCurrency(selectedScenario.postDebtSalary)}
            />
            <DataRow
              label={`${a.partner2Name} gross`}
              value={formatCurrency(selectedScenario.partner2PostDebtSalary ?? selectedScenario.postDebtSalary)}
            />
            <DataRow
              label={`Employer costs at ${formatPercent(a.employerLoad, 0)}`}
              value={formatCurrency((selectedScenario.postDebtSalary + (selectedScenario.partner2PostDebtSalary ?? selectedScenario.postDebtSalary)) * a.employerLoad)}
            />
            <DataRow
              label="Total company cash cost / month"
              value={formatCurrency((selectedScenario.postDebtSalary + (selectedScenario.partner2PostDebtSalary ?? selectedScenario.postDebtSalary)) * (1 + a.employerLoad))}
              emphasis
            />
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Personal income tax and National Insurance are outside this company cash model. There are
            no automatic distributions — cash above the target stays in the company unless the owners
            decide otherwise.
          </p>
        </Accordion>
      </div>

      <Card className="mt-6">
        <p className="text-sm text-muted">
          Inputs are saved in this browser. Nothing leaves the device — there is no server, no
          account and no sync yet.
        </p>
      </Card>
    </div>
  );
}
