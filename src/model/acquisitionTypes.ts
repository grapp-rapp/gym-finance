export interface AcquisitionCost {
  id: string;
  name: string;
  gross: number;
  vatable: boolean;
  note: string;
}
export interface MemberCohort {
  id: string;
  name: string;
  members: number;
  monthlyGross: number;
  renewalMonth: number;
  renewalRate: number;
  prepaid: boolean;
}
export interface AcquisitionPlan {
  enabled: boolean;
  /** Marks the requested scheduled-payments / reinvestment update as applied. */
  capitalPolicyVersion?: 1;
  /** Net active-member goals. Absent on older saved acquisition plans. */
  growth?: { enabled: boolean; yearEndTargets: [number, number, number, number, number] };
  purchaseGross: number;
  purchaseVatable: boolean;
  renovation: AcquisitionCost[];
  contingencyRate: number;
  adminGross: number;
  sellerSettlementGross: number;
  baselineMonthlyGross: number;
  revenueUplift: number;
  retainedAtYearOne: number;
  annualRevenueGrowth: number;
  revenueMode: 'baseline' | 'cohorts';
  cohorts: MemberCohort[];
  monthlyChurn: number;
  newMembersPerMonth: number;
  /** Operational planning only; collection losses are entered separately. */
  renovationClosureDays?: number;
  renovationMonths: number;
  renovationCollectionShare: number;
  graceType: 'capitalized' | 'interest-only' | 'free';
  phase2Enabled: boolean;
  phase2Gross: number;
  /** Women's allocation is the remainder of the combined equipment budget. */
  phase2MenGross?: number;
  phase2Vatable: boolean;
  phase2OperatingMonth: number;
  phase2GuardCash: boolean;
  phase2VatDelay: number;
}
