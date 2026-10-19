import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIOS, ACQUISITION_POLICY, acquisitionAssumptions, acquisitionRevenue, blendedMembershipFee, contractualSchedule, loanTerms, monthlyBreakEven, monthlyBreakEvenAfterTax, operatingCostTotals, runModel, startupTotals } from '..';
import { activateAcquisition, decodeState, defaultState, swapPreviousPlan, type PersistedState } from '../../state/persistence';
import { actualTotals } from '../actuals';
import { validPlan } from '../../../server/validation.mjs';

// The flat-income downside remains available independently of the new growth base case.
function setup() {
  const a = acquisitionAssumptions(DEFAULT_ASSUMPTIONS);
  a.acquisition!.growth!.enabled = false;
  return a;
}
describe('acquire and improve in phases', () => {
  it('budgets 395k gross, keeps the 100k target as cash and excludes the old machine purchase', () => {
    const a = setup(), s = startupTotals(a);
    expect(s.grossCash).toBeCloseTo(395000, 6);
    expect(s.cashHeadroom).toBeCloseTo(105000, 6);
    expect(s.reclaimableVat).toBeCloseTo(215000 * 18 / 118, 6);
    expect(s.lines.some(x => x.id === 'gym-equipment')).toBe(false);
    expect(a.acquisition!.phase2Enabled).toBe(false);
    expect(a.loanAPrincipal).toBe(0);
  });
  it('keeps studio and one salaried employee, loading neither twice', () => {
    const a = setup();
    expect(a.operatingCosts.find(x => x.id === 'hodaya')?.monthlyGross).toBe(9000);
    expect(a.operatingCosts.find(x => x.id === 'studio')?.monthlyGross).toBe(14500);
    expect(operatingCostTotals(a).monthlyGross).toBe(67509);
    expect(a.operatingCosts.filter(x => x.category === 'Staff')).toHaveLength(1);
    const model = runModel(a, ACQUISITION_POLICY);
    expect(model.months.every(m => m.ownerPayrollTotal === 0)).toBe(true);
  });
  it('capitalizes exactly twelve months of interest and starts payment in month thirteen', () => {
    const a = setup(), m = runModel(a, ACQUISITION_POLICY).months;
    expect(m).toHaveLength(61);
    expect(m[0].totalCashOut).toBe(0);
    expect(m.slice(1,13).every(x => x.regularDebtPayment === 0)).toBe(true);
    expect(m[12].loanBBalance).toBeCloseTo(500000 * Math.pow(1 + 0.0475 / 12, 12), 5);
    expect(m[13].regularDebtPayment).toBeCloseTo(loanTerms(a).loanBPayment, 7);
    expect(m[13].regularDebtPayment).toBeGreaterThan(9800);
    expect(m[13].regularDebtPayment).toBeLessThan(9900);
    const contract = contractualSchedule(a, 72);
    expect(contract[12].loanBClosing).toBeCloseTo(m[12].loanBBalance, 5);
    expect(contract[72].loanBClosing).toBeCloseTo(0, 5);
  });
  it('supports interest-only and zero-grace loans without a hidden month', () => {
    const a=setup(); a.acquisition!.graceType='interest-only';
    const r=runModel(a,ACQUISITION_POLICY);
    expect(r.months[1].regularDebtPayment).toBeCloseTo(500000*.0475/12,6);
    expect(r.months[12].loanBBalance).toBeCloseTo(500000,6);
    a.graceMonths=0;
    expect(runModel(a,ACQUISITION_POLICY).months[1].regularDebtPayment).toBeCloseTo(loanTerms(a).loanBPayment,6);
  });
  it('uses historical collections, zero trial sales, and explicit disruption / retention', () => {
    const a=setup();
    expect(acquisitionRevenue(a,1).collected).toBe(74200*.9);
    expect(acquisitionRevenue(a,2).collected).toBe(74200);
    a.acquisition!.revenueUplift=.1;
    expect(acquisitionRevenue(a,2).collected).toBeCloseTo(81620,7);
    a.acquisition!.retainedAtYearOne=.8;
    expect(acquisitionRevenue(a,12).collected).toBeCloseTo(81620*.8,6);
    expect(a.oneMonthPassesPerMonth+a.dayPassesPerMonth+a.otherIncomeGross).toBe(0);
  });
  it('keeps transferred prepaid cash separate from recurring collections and recognises service without charging twice', () => {
    const a=setup(); a.acquisition!.revenueMode='cohorts'; a.acquisition!.renovationMonths=0;
    a.acquisition!.cohorts=[{id:'prepaid',name:'Existing',members:100,monthlyGross:206,renewalMonth:4,renewalRate:.8,prepaid:true}];
    a.acquisition!.sellerSettlementGross=30000;
    const r=runModel(a,ACQUISITION_POLICY);
    expect(r.months[0].openingCash).toBeCloseTo(135000,6);
    expect(r.months[1].membershipCashIn).toBe(0);
    expect(r.months[1].membershipEarnedGross).toBe(20600);
    expect(r.months[1].vatCollected).toBe(0);
    expect(r.months[1].netCashChange).toBeCloseTo(-operatingCostTotals(a).monthlyExVat,5);
    expect(r.months[4].membershipCashIn).toBeCloseTo(80*blendedMembershipFee(a),6);
    expect(r.months[4].totalMembers).toBe(80);
  });
  it('counts both couple members, caps cohorts and excludes day-pass visitors from capacity', () => {
    const a=setup();a.acquisition!.revenueMode='cohorts';a.acquisition!.renovationMonths=0;
    a.mixStandard=0;a.mixSoldier=0;a.mixCouple=1;
    a.acquisition!.cohorts=[{id:'couples',name:'50 couples',members:100,monthlyGross:225,renewalMonth:1,renewalRate:1,prepaid:false}];
    a.dayPassesPerMonth=100;
    const m=runModel(a,ACQUISITION_POLICY).months[1];
    expect(m.totalMembers).toBe(100);expect(m.membershipCashIn).toBe(22500);expect(m.otherCashIn).toBe(3500);
    a.capacity=50;expect(runModel(a,ACQUISITION_POLICY).months[1].totalMembers).toBe(50);
  });
  it('posts phase-two spending once, refunds its VAT later, and reconciles the bank every month', () => {
    const a=setup();a.selfFinancing=1000000;a.acquisition!.phase2Enabled=true;a.acquisition!.phase2OperatingMonth=4;a.acquisition!.phase2Gross=118000;
    const r=runModel(a,ACQUISITION_POLICY);
    expect(r.months.filter(m=>(m.capitalSpending??0)>0)).toHaveLength(1);
    // Renovation makes month one cash-negative, so three positive months finish at month four.
    expect(r.months[5].capitalSpending).toBe(118000);
    expect(r.months[7].startupVatRefund).toBeCloseTo(18000,6);
    for(const m of r.months) expect(m.openingCash+m.totalCashIn-m.totalCashOut).toBeCloseTo(m.endingCash,6);
    expect(r.years[0].capitalSpending).toBe(118000);
  });
  it('defers an unaffordable phase-two purchase and never uses expected VAT as upfront cash', () => {
    const a=setup();a.acquisition!.phase2Enabled=true;a.acquisition!.phase2OperatingMonth=1;a.acquisition!.phase2Gross=150000;
    const r=runModel(a,ACQUISITION_POLICY);
    expect(r.months.every(m=>(m.capitalSpending??0)===0)).toBe(true);
    expect(r.months[0].endingCash).toBeCloseTo(105000,6);
  });
  it('break-even includes VAT and card fees and leaves no operating deficit before tax', () => {
    const a=setup(), gross=monthlyBreakEven(a,operatingCostTotals(a).monthlyExVat,loanTerms(a).totalPayment);
    expect(gross*(1-a.cardFeeRate)/(1+a.vatRate)-operatingCostTotals(a).monthlyExVat-loanTerms(a).totalPayment).toBeCloseTo(0,7);
  });
  it('distinguishes principal repayment from deductible interest when estimating after-tax break-even', () => {
    const a=setup(), debt=loanTerms(a).totalPayment, interest=500000*Math.pow(1+.0475/12,12)*.0475/12;
    const opex=operatingCostTotals(a).monthlyExVat;
    const gross=monthlyBreakEvenAfterTax(a,opex,debt,interest);
    const surplus=gross*(1-a.cardFeeRate)/(1+a.vatRate)-opex;
    expect(surplus-debt-Math.max(0,surplus-interest-a.monthlyDepreciation)*a.corporateTaxRate).toBeCloseTo(0,6);
    expect(gross).toBeGreaterThan(monthlyBreakEven(a,opex,debt));
  });
  it('does not approve equipment just because a large equity injection masks monthly trading losses', () => {
    const a=setup();a.selfFinancing=2000000;a.sweepsEnabled=false;a.acquisition!.phase2Enabled=true;a.acquisition!.phase2OperatingMonth=18;
    expect(runModel(a,ACQUISITION_POLICY).months.every(m=>(m.capitalSpending??0)===0)).toBe(true);
  });
  it('supports a deliberately scheduled upgrade and a same-month VAT credit without duplicating cash', () => {
    const a=setup();a.acquisition!.phase2Enabled=true;a.acquisition!.phase2OperatingMonth=1;a.acquisition!.phase2GuardCash=false;a.acquisition!.phase2VatDelay=0;a.acquisition!.phase2Gross=118000;
    const r=runModel(a,ACQUISITION_POLICY), m=r.months[1];
    expect(m.capitalSpending).toBe(118000);expect(m.startupVatRefund).toBeCloseTo(18000,6);
    expect(m.openingCash+m.totalCashIn-m.totalCashOut).toBeCloseTo(m.endingCash,6);
  });
  it('loads old plans unchanged and switches only with a restorable full copy', () => {
    const old:PersistedState={version:3,assumptions:structuredClone(DEFAULT_ASSUMPTIONS),scenarios:structuredClone(DEFAULT_SCENARIOS),selectedScenarioId:'B',actuals:[{timelineMonth:4,endingCash:123456,note:'Original bank reconciliation'}],anchorMonth:'2026-09',mode:'actual'};
    const loaded=decodeState(old);expect(loaded.assumptions.acquisition).toBeUndefined();
    const next=activateAcquisition(loaded);expect({version:3,...next.previousPlan}).toEqual(old);expect(next.actuals).toEqual([]);
    expect(next.previousPlan?.scenarios[1]).toEqual(old.scenarios[1]);
    expect(activateAcquisition(next)).toBe(next);
    next.actuals=[{timelineMonth:2,endingCash:98765,note:'Acquisition bank actual'}];
    const restored=swapPreviousPlan(next);
    expect(restored.actuals).toEqual(old.actuals);
    expect(activateAcquisition(restored).actuals).toEqual(next.actuals);
    expect(swapPreviousPlan(restored).assumptions).toEqual(next.assumptions);
    expect(validPlan(JSON.parse(JSON.stringify(next)))).toBe(true);
    expect(validPlan(defaultState())).toBe(true);
  });
  it('rejects broken cloud acquisition data and requires actual upgrade / refund amounts before totaling them', () => {
    const state=defaultState();state.assumptions.acquisition!.graceType='unsupported' as never;
    expect(validPlan(state)).toBe(false);
    const actual={timelineMonth:2,membershipCashIn:1000,otherCashIn:0,operatingCashOut:500,debtPayment:0,corporateTax:0,ownerPayroll:0};
    expect(actualTotals(actual,{capitalRequired:true}).cashOut).toBeNull();
    expect(actualTotals({...actual,capitalSpending:100,capitalVatRefund:20},{capitalRequired:true,vatRefundRequired:true})).toEqual({cashIn:1020,cashOut:600});
  });
});
