import { NumberField, Toggle } from './ui';
import type { ScenarioPolicy } from '../model';

export function PartnerSalaryFields({ policy, partner1, partner2, update }: {
  policy: ScenarioPolicy;
  partner1: string;
  partner2: string;
  update: (value: Partial<ScenarioPolicy>) => void;
}) {
  const step = policy.salaryStep ?? { enabled: false, operatingMonth: 13, partner1Gross: policy.preDebtSalary, partner2Gross: policy.partner2PreDebtSalary ?? policy.preDebtSalary };
  return <>
    <NumberField label={`${partner1} — before debt-free gross / month`} value={policy.preDebtSalary}
      onChange={(preDebtSalary) => update({ preDebtSalary, partner2PreDebtSalary: policy.partner2PreDebtSalary ?? policy.preDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner2} — before debt-free gross / month`} value={policy.partner2PreDebtSalary ?? policy.preDebtSalary}
      onChange={(partner2PreDebtSalary) => update({ partner2PreDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner1} — after debt-free gross / month`} value={policy.postDebtSalary}
      onChange={(postDebtSalary) => update({ postDebtSalary, partner2PostDebtSalary: policy.partner2PostDebtSalary ?? policy.postDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner2} — after debt-free gross / month`} value={policy.partner2PostDebtSalary ?? policy.postDebtSalary}
      onChange={(partner2PostDebtSalary) => update({ partner2PostDebtSalary })} prefix="₪" step={500} min={0} />
    <div className="sm:col-span-3 rounded-xl border border-line p-3 space-y-3">
      <Toggle label="Schedule a salary increase before debt-free" checked={step.enabled}
        onChange={(enabled) => update({ salaryStep: { ...step, enabled } })}
        description="Set a planned increase while loans are still outstanding. The forecast shows its effect on cash and debt payoff." />
      {step.enabled && <>
        <NumberField label="Increase from operating month" value={step.operatingMonth} min={1} max={120} step={1}
          onChange={(operatingMonth) => update({ salaryStep: { ...step, operatingMonth: Math.round(operatingMonth) } })}
          hint="Month 13 is the start of year 2. The increase cannot begin before this scenario’s salary start month." />
        <NumberField label={partner1 + ' — new gross / month'} value={step.partner1Gross} min={0} step={500} prefix="₪"
          onChange={(partner1Gross) => update({ salaryStep: { ...step, partner1Gross } })} />
        <NumberField label={partner2 + ' — new gross / month'} value={step.partner2Gross} min={0} step={500} prefix="₪"
          onChange={(partner2Gross) => update({ salaryStep: { ...step, partner2Gross } })} />
        <p className="text-sm text-muted">These are replacement monthly amounts, not additions. Once debt is cleared, the after-debt salaries above take over. Check the cash forecast against your reserve target before choosing an increase.</p>
      </>}
    </div>
  </>;
}
