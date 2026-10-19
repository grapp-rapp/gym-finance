import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
const out = new URL('../.acquisition-report-runtime.mjs', import.meta.url);
const result = await build({ entryPoints: ['src/model/index.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
await writeFile(out, result.outputFiles[0].text);
try {
  const model = await import(out.href);
  const a = model.acquisitionAssumptions(model.DEFAULT_ASSUMPTIONS), policy = model.ACQUISITION_POLICY;
  const startup = model.startupTotals(a), costs = model.operatingCostTotals(a), terms = model.loanTerms(a);
  const cases = [0,.05,.1,.15,.2].map(uplift => {
    const aa = structuredClone(a); aa.acquisition.revenueUplift=uplift;
    const forecast = model.runModel(aa,policy), gross=aa.acquisition.baselineMonthlyGross*(1+uplift);
    const beforeDebt=gross*(1-aa.cardFeeRate)/(1+aa.vatRate)-costs.monthlyExVat;
    return { uplift, monthlyCollectionsGross:gross, monthlyRevenueExVat:gross/(1+aa.vatRate), monthlyTradingCashBeforeDebtAndTax:beforeDebt, monthlyCashAfterScheduledDebtBeforeTax:beforeDebt-terms.totalPayment, year1EndingCash:forecast.years[0].endingCash, debtFreeOperatingMonth:forecast.debtFreeOperatingMonth, year5EndingCash:forecast.year5EndingCash, lowestBankCash:forecast.minCashFullTimeline, firstBelowTarget:forecast.months.find(m=>m.endingCash<policy.cashTarget)?.operatingMonth ?? null, annualMembershipCash:forecast.years.map(y=>y.grossBillings) };
  });
  const retentionCases=[1,.9,.8].map(retained=>{const aa=structuredClone(a);aa.acquisition.retainedAtYearOne=retained;const r=model.runModel(aa,policy);return{retainedByMonth12:retained,year1Cash:r.years[0].endingCash,year5Cash:r.year5EndingCash,lowestCash:r.minCashFullTimeline};});
  const report={date:'2026-10-19',basis:'Planning estimates, not quotes; current collection improvements unverified; owners unpaid; phase two off.',startupGross:startup.grossCash,startupVatCredit:startup.reclaimableVat,loanPrincipal:a.loanBPrincipal,openingCashBeforeRefund:startup.cashHeadroom,cashTarget:policy.cashTarget,upfrontFundingIncludingTarget:startup.grossCash+policy.cashTarget,operatingGross:costs.monthlyGross,operatingExVat:costs.monthlyExVat,annualRate:terms.primeRate,balanceAfterGrace:a.loanBPrincipal*Math.pow(1+terms.primeRate/12,a.graceMonths),monthlyRepayment:terms.totalPayment,breakEvenGrossBeforeDebt:model.monthlyBreakEven(a,costs.monthlyExVat),breakEvenGrossAfterDebt:model.monthlyBreakEven(a,costs.monthlyExVat,terms.totalPayment),breakEvenGrossAfterDebtAndSteadyTax:model.monthlyBreakEvenAfterTax(a,costs.monthlyExVat,terms.totalPayment,a.loanBPrincipal*Math.pow(1+terms.primeRate/12,a.graceMonths)*terms.primeRate/12),cases,retentionCases};
  await writeFile('ACQUISITION_COMPARISON.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { await unlink(out); }
