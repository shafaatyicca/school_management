import { pkMidnight, pkParts, daysInMonth } from "@/lib/pkTime";

/**
 * Due date of a billing month = the due day, 11:59:59 PM Pakistan time.
 * month = 1–12 (13 → January of next year is fine).
 * Short months: day 31 → last day of the month.
 */
export function billingDueDate(year: number, month: number, dueDay: number) {
  const y = year + Math.floor((month - 1) / 12);
  const m = ((((month - 1) % 12) + 12) % 12) + 1;
  const day = Math.min(Math.max(1, Number(dueDay) || 1), daysInMonth(y, m));
  return new Date(pkMidnight(y, m, day + 1).getTime() - 1); // 11:59:59.999 PM (Pakistan)
}

// Late fee amount (fixed or percentage of the outstanding amount)
export function lateFeeAmount(baseAmount: number, mode: string, value: number) {
  if (!value || value <= 0 || baseAmount <= 0) return 0;
  return mode === "percentage" ? Math.round((baseAmount * value) / 100) : value;
}

export function computeVoucherDates(issue: Date, dueDay: number, validityDays: number) {
  const p = pkParts(issue); // Pakistan day of the issue date
  const issueDayStart = pkMidnight(p.y, p.m, p.d);

  let dueDate = billingDueDate(p.y, p.m, dueDay);
  if (issueDayStart > dueDate) dueDate = billingDueDate(p.y, p.m + 1, dueDay);

  const due = pkParts(dueDate);
  const validTill = new Date(
    pkMidnight(due.y, due.m + 1, 1 + Number(validityDays || 0)).getTime() - 1000, // 11:59:59 PM
  );

  return { dueDate, validTill };
}

// Default undertaking text for the Admission Form (schools can change it in Settings)
export const DEFAULT_UNDERTAKING =
  "I hereby confirm that all the data provided above is correct to the best of my knowledge. I shall abide by all the Campus rules and regulations.";