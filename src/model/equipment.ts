import { equipmentAllocation } from './acquisition';
import { runModel } from './cashflow';
import { startupTotals } from './costs';
import type { Assumptions, ScenarioPolicy } from './types';

/** Compare alternative equipment totals with identical sales and scheduled debt payments. */
export function equipmentBudgetCase(a: Assumptions, policy: ScenarioPolicy, gross: number) {
  const p = a.acquisition!, allocation = equipmentAllocation(p);
  const menShare = p.phase2Gross > 0 ? allocation.menGross / p.phase2Gross : .5;
  const candidate: Assumptions = { ...a, sweepsEnabled: false, acquisition: {
    ...p, phase2Enabled: gross > 0, phase2Gross: gross, phase2MenGross: gross * menShare, phase2GuardCash: true,
  } };
  const result = runModel(candidate, policy), startup = startupTotals(candidate);
  const purchase = result.months.find(m => (m.capitalSpending ?? 0) > 0);
  const cashBeforePurchase = purchase ? purchase.openingCash + purchase.membershipCashIn + purchase.otherCashIn - purchase.operatingCashOut - purchase.regularDebtPayment - purchase.ownerPayrollTotal - purchase.corporateTax : null;
  return {
    gross, allocation: equipmentAllocation(candidate.acquisition!), assumptions: candidate, result,
    purchaseMonth: purchase?.operatingMonth ?? null,
    cashAfterPurchase: purchase?.endingCash ?? null,
    cashBeforePurchase,
    extraUpfrontCash: Math.max(0, startup.grossCash + gross + policy.cashTarget - startup.totalFinancing - p.sellerSettlementGross),
    projectGross: startup.grossCash + gross,
    equipmentVat: p.phase2Vatable ? gross - gross / (1 + a.vatRate) : 0,
  };
}
