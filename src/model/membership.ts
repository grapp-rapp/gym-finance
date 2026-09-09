import { excelRound, excelRoundUp } from './excel';
import type { Assumptions } from './types';

/**
 * Membership ramp.
 * Reference: "Monthly Base" sheet, column D.
 *
 * Operating month 1 is the reopening month and starts at retained members.
 * Months 2-12 interpolate linearly to the Year 1 target; each following year
 * interpolates linearly between consecutive year-end targets. Every step is
 * rounded to whole members exactly as the sheet does, then capped at capacity.
 */

/** Members retained at reopening: ROUND(currentMembers × retention, 0). */
export function reopeningMembers(a: Assumptions): number {
  return excelRound(a.currentMembers * a.retentionAtReopening, 0);
}

/** Organic members for a given operating month (0 during the build period). */
export function organicMembersAt(a: Assumptions, operatingMonth: number): number {
  if (operatingMonth === 0) return 0;

  const reopen = reopeningMembers(a);
  const [t1, t2, t3, t4, t5] = a.yearEndTargets;
  let value: number;

  if (operatingMonth === 1) {
    value = reopen;
  } else if (operatingMonth <= 12) {
    value = excelRound(reopen + ((t1 - reopen) * (operatingMonth - 1)) / 11, 0);
  } else if (operatingMonth <= 24) {
    value = excelRound(t1 + ((t2 - t1) * (operatingMonth - 12)) / 12, 0);
  } else if (operatingMonth <= 36) {
    value = excelRound(t2 + ((t3 - t2) * (operatingMonth - 24)) / 12, 0);
  } else if (operatingMonth <= 48) {
    value = excelRound(t3 + ((t4 - t3) * (operatingMonth - 36)) / 12, 0);
  } else {
    value = excelRound(t4 + ((t5 - t4) * Math.min(operatingMonth - 48, 12)) / 12, 0);
  }

  return Math.min(a.capacity, value);
}

/**
 * Organic members actually billed.
 * Reference: "Monthly Base" column E.
 *
 * When Moatza is on, the Moatza block reserves capacity, so organic members are
 * capped at (capacity − Moatza block). Moatza is therefore incremental only until
 * total membership reaches capacity, after which it displaces organic demand.
 */
export function organicBilledAt(a: Assumptions, operatingMonth: number): number {
  if (operatingMonth === 0) return 0;
  const organic = organicMembersAt(a, operatingMonth);
  if (a.moatzaEnabled) {
    return Math.min(organic, Math.max(0, a.capacity - a.moatzaMembers));
  }
  return Math.min(organic, a.capacity);
}

/** Moatza members active in a given operating month. Reference: "Monthly Base" column F. */
export function moatzaMembersAt(a: Assumptions, operatingMonth: number): number {
  return a.moatzaEnabled && operatingMonth >= a.moatzaStartMonth ? a.moatzaMembers : 0;
}

/**
 * Blended organic membership fee, gross of VAT.
 * Reference: Inputs B44 — weighted average of the three price tiers.
 */
export function blendedMembershipFee(a: Assumptions): number {
  return (
    a.priceFullAccess * a.mixFullAccess +
    a.priceSingleService * a.mixSingleService +
    a.priceSoldier * a.mixSoldier
  );
}

/**
 * Blended fee for a specific operating month, with annual price inflation applied.
 * Reference: "Monthly Base" column H — inflation steps at each operating year boundary.
 */
export function blendedFeeAt(a: Assumptions, operatingMonth: number): number {
  const yearIndex = Math.max(0, excelRoundUp(operatingMonth / 12, 0) - 1);
  return blendedMembershipFee(a) * Math.pow(1 + a.priceInflation, yearIndex);
}
