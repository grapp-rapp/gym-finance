import { NumberField } from './ui';
import type { ScenarioPolicy } from '../model';

export function PartnerSalaryFields({ policy, partner1, partner2, update }: {
  policy: ScenarioPolicy;
  partner1: string;
  partner2: string;
  update: (value: Partial<ScenarioPolicy>) => void;
}) {
  return <>
    <NumberField label={`${partner1} — before debt-free gross / month`} value={policy.preDebtSalary}
      onChange={(preDebtSalary) => update({ preDebtSalary, partner2PreDebtSalary: policy.partner2PreDebtSalary ?? policy.preDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner2} — before debt-free gross / month`} value={policy.partner2PreDebtSalary ?? policy.preDebtSalary}
      onChange={(partner2PreDebtSalary) => update({ partner2PreDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner1} — after debt-free gross / month`} value={policy.postDebtSalary}
      onChange={(postDebtSalary) => update({ postDebtSalary, partner2PostDebtSalary: policy.partner2PostDebtSalary ?? policy.postDebtSalary })} prefix="₪" step={500} min={0} />
    <NumberField label={`${partner2} — after debt-free gross / month`} value={policy.partner2PostDebtSalary ?? policy.postDebtSalary}
      onChange={(partner2PostDebtSalary) => update({ partner2PostDebtSalary })} prefix="₪" step={500} min={0} />
  </>;
}
