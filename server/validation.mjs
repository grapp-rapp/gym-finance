function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function safeValue(value, depth = 0) {
  if (depth > 12) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 10000;
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= 1e12;
  if (Array.isArray(value)) return value.length <= 500 && value.every(item => safeValue(item, depth + 1));
  if (object(value)) return Object.entries(value).every(([key, item]) => !['__proto__', 'constructor', 'prototype'].includes(key) && safeValue(item, depth + 1));
  return false;
}
const numericAssumptions = ['selfFinancing','launchMembers','closureMonths','operatingMonths','currentMembers','retentionAtReopening','capacity','priceStandard','priceCouple','priceSoldier','mixStandard','mixCouple','mixSoldier','priceOneMonth','priceDayPass','oneMonthPassesPerMonth','dayPassesPerMonth','otherIncomeGross','cardFeeRate','priceInflation','moatzaMembers','moatzaFee','moatzaStartMonth','opexInflation','closureCostExVat','buildVatRefundMonth','loanAPrincipal','loanARate','loanBPrincipal','boiRate','primeSpread','graceMonths','repaymentMonths','vatRate','corporateTaxRate','monthlyDepreciation','sweepShareOfExcess','employerLoad','partner1Share'];
const scenarioNumbers = ['preDebtStartMonth','preDebtSalary','postDebtSalary','cashTarget','sweepFrequency','firstSweepMonth'];
export function validPlan(state) {
  if (!object(state) || state.version !== 3 || !safeValue(state)) return false;
  const a = state.assumptions;
  if (!object(a) || !numericAssumptions.every(key => typeof a[key] === 'number')) return false;
  if (![a.operatingMonths, a.closureMonths, a.graceMonths, a.repaymentMonths].every(Number.isInteger) || a.operatingMonths < 1 || a.operatingMonths > 600 || a.closureMonths < 0 || a.closureMonths > 120 || a.graceMonths < 0 || a.repaymentMonths < 1) return false;
  if (!['moatzaEnabled','sweepsEnabled'].every(key => typeof a[key] === 'boolean') || !['partner1Name','partner2Name'].every(key => typeof a[key] === 'string')) return false;
  if (!Array.isArray(a.yearEndTargets) || a.yearEndTargets.length !== 5 || !a.yearEndTargets.every(n => typeof n === 'number')) return false;
  if (!Array.isArray(a.operatingCosts) || !a.operatingCosts.every(c => object(c) && ['id','name','category','note'].every(k => typeof c[k] === 'string') && typeof c.monthlyGross === 'number' && typeof c.vatable === 'boolean')) return false;
  if (!Array.isArray(a.startupCosts) || !a.startupCosts.every(c => object(c) && ['id','name','note'].every(k => typeof c[k] === 'string') && typeof c.exVat === 'number' && typeof c.vatable === 'boolean')) return false;
  if (a.sweepNotBeforeTimelineMonth !== null && typeof a.sweepNotBeforeTimelineMonth !== 'number') return false;
  if (!Array.isArray(state.scenarios) || !state.scenarios.length || !state.scenarios.every(s => object(s) && ['id','name','description'].every(k => typeof s[k] === 'string') && scenarioNumbers.every(k => typeof s[k] === 'number') && typeof s.builtIn === 'boolean' && s.sweepFrequency >= 1 && (!s.salaryStep || (object(s.salaryStep) && typeof s.salaryStep.enabled === 'boolean' && ['operatingMonth','partner1Gross','partner2Gross'].every(k => typeof s.salaryStep[k] === 'number'))))) return false;
  if (new Set(state.scenarios.map(s => s.id)).size !== state.scenarios.length || !state.scenarios.some(s => s.id === state.selectedScenarioId)) return false;
  if (!Array.isArray(state.actuals) || !state.actuals.every(entry => object(entry) && Number.isInteger(entry.timelineMonth) && entry.timelineMonth >= 0 && Object.entries(entry).every(([k,v]) => k === 'note' ? typeof v === 'string' : ['timelineMonth','members','membershipCashIn','otherCashIn','operatingCashOut','debtPayment','corporateTax','ownerPayroll','endingCash'].includes(k) && typeof v === 'number'))) return false;
  return typeof state.anchorMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(state.anchorMonth) && ['plan','actual'].includes(state.mode);
}
