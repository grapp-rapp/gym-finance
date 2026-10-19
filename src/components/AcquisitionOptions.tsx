import { useId } from 'react';
import { ACQUISITION_POLICY, duplicateScenario, type ScenarioPolicy } from '../model';
import { formatCurrency, formatNumber } from '../lib/format';
import { useAppState } from '../state/AppState';
import { PartnerSalaryFields } from './PartnerSalaryFields';
import { Button, Callout, Card, DataRow, NumberField, PercentField, SectionTitle, Toggle } from './ui';

export function AcquisitionOptionSummary({ onEdit }: { onEdit: () => void }) {
  const { assumptions: a, selectedScenario, result } = useAppState();
  return <Card>
    <SectionTitle right={<Button size="sm" onClick={onEdit}>Edit Moatza and owner salaries</Button>}>Moatza and owner salary options</SectionTitle>
    <DataRow label="Moatza membership deal" value={a.moatzaEnabled ? `${formatNumber(a.moatzaMembers)} people · ${formatCurrency(a.moatzaFee)} gross each · from month ${a.moatzaStartMonth}` : 'Off — available in Acquisition plan'} />
    <DataRow label="Selected salary scenario" value={selectedScenario.name} />
    <DataRow label="Owner salaries start" value={result.salaryStartOperatingMonth === null ? 'No owner salary within this forecast' : `Operating month ${result.salaryStartOperatingMonth}`} />
    <p className="mt-3 text-sm text-muted">Both options remain available with equipment investment and scheduled debt payments. Owner pay can start before the loan is cleared.</p>
  </Card>;
}

export function MoatzaOptions() {
  const { assumptions: a, setAssumptions } = useAppState();
  return <Card>
    <SectionTitle>Moatza membership option</SectionTitle>
    <Toggle label="Include the Moatza deal" checked={a.moatzaEnabled} onChange={moatzaEnabled => setAssumptions({ moatzaEnabled })} description="Optional additional membership block. Keep existing settings or turn it off without deleting the deal assumptions." />
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <NumberField label="Moatza members · people" value={a.moatzaMembers} min={0} disabled={!a.moatzaEnabled} onChange={moatzaMembers => setAssumptions({ moatzaMembers: Math.round(moatzaMembers) })} />
      <NumberField label="Fee per Moatza member · gross including VAT" value={a.moatzaFee} min={0} prefix="₪" disabled={!a.moatzaEnabled} onChange={moatzaFee => setAssumptions({ moatzaFee })} />
      <NumberField label="Moatza starts · operating month" value={a.moatzaStartMonth} min={1} max={600} disabled={!a.moatzaEnabled} onChange={moatzaStartMonth => setAssumptions({ moatzaStartMonth: Math.round(moatzaStartMonth) })} />
    </div>
    <p className="mt-3 text-sm text-muted">Growth targets are organic members. Moatza members are additional until combined capacity is reached, then displace organic membership. This is the existing capacity rule. Add only income not already included in historical collections.</p>
    {a.moatzaEnabled && <div className="mt-3"><DataRow label="Moatza gross collections per active month" value={formatCurrency(a.moatzaMembers * a.moatzaFee)} /><DataRow label="Organic places available once the deal starts" value={formatNumber(Math.max(0, a.capacity - a.moatzaMembers), { showZero: true })} /></div>}
    {a.moatzaEnabled && a.moatzaMembers > a.capacity && <Callout tone="bad" title="Moatza exceeds gym capacity">Reduce the member block or revise the combined capacity before relying on this forecast.</Callout>}
  </Card>;
}

export function OwnerSalaryOptions() {
  const { assumptions: a, scenarios, selectedScenario, selectScenario, setScenario, addScenario, setAssumptions, result } = useAppState();
  const selectId = useId();
  const editSalary = (patch: Partial<ScenarioPolicy>) => {
    if (selectedScenario.builtIn) {
      const count = scenarios.filter(s => s.name.startsWith('Custom owner salaries')).length;
      addScenario({ ...duplicateScenario(selectedScenario, scenarios.map(s => s.id)), name: `Custom owner salaries${count ? ` ${count + 1}` : ''}`, description: 'Independent partner salaries and optional increases, including while debt remains.', ...patch });
    } else setScenario(selectedScenario.id, patch);
  };
  const useUnpaid = () => {
    const unpaid = scenarios.find(s => s.preDebtSalary === 0 && (s.partner2PreDebtSalary ?? 0) === 0 && s.postDebtSalary === 0 && (s.partner2PostDebtSalary ?? 0) === 0 && (!s.salaryStep?.enabled || s.salaryStep.partner1Gross + s.salaryStep.partner2Gross === 0));
    if (unpaid) selectScenario(unpaid.id);
    else addScenario({ ...duplicateScenario(ACQUISITION_POLICY, scenarios.map(s => s.id)), name: 'Owners unpaid', cashTarget: selectedScenario.cashTarget });
  };
  return <Card>
    <SectionTitle right={<Button size="sm" variant="secondary" onClick={useUnpaid}>Use unpaid-owner option</Button>}>Owner salaries</SectionTitle>
    <p className="mb-4 text-sm text-muted">Pay either partner while the loan remains outstanding, choose when pay begins, and schedule a later increase. Editing a built-in policy creates and selects a custom salary scenario, keeping the original available.</p>
    <label htmlFor={selectId} className="block text-sm font-medium text-ink-2">Salary scenario used in the forecast</label>
    <select id={selectId} className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-ink" value={selectedScenario.id} onChange={e => selectScenario(e.target.value)}>{scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <NumberField label="Salary starts · operating month" value={Math.max(1, selectedScenario.preDebtStartMonth)} min={1} max={600} onChange={preDebtStartMonth => editSalary({ preDebtStartMonth: Math.round(preDebtStartMonth) })} hint="Month 1 is takeover; month 13 is the start of year 2. This applies to pay while debt remains." />
      <PercentField label="Employer costs on owner gross pay" value={a.employerLoad} min={0} max={1} onChange={employerLoad => setAssumptions({ employerLoad })} />
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-3"><PartnerSalaryFields policy={selectedScenario} partner1={a.partner1Name} partner2={a.partner2Name} update={editSalary} /></div>
    <div className="mt-4"><DataRow label="Combined payroll before debt-free · before a scheduled increase" value={formatCurrency((selectedScenario.preDebtSalary + (selectedScenario.partner2PreDebtSalary ?? selectedScenario.preDebtSalary)) * (1 + a.employerLoad))} /><DataRow label="Year 1 owner payroll in this forecast" value={formatCurrency(result.years[0]?.ownerPayroll ?? 0)} /><DataRow label="First salary in the forecast" value={result.salaryStartOperatingMonth === null ? 'None within the forecast' : `Operating month ${result.salaryStartOperatingMonth}`} /></div>
    <p className="mt-3 text-sm text-muted">Salary cash costs include employer costs and automatically affect tax, monthly bank cash and when equipment becomes affordable. After-debt salaries begin only once the loan is cleared; use the before-debt amounts or the scheduled increase to pay yourselves earlier. Compare all policies in Scenario lab.</p>
  </Card>;
}
