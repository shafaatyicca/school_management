export function billingDueDate(year: number, month: number, dueDay: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(dueDay, lastDay), 23, 59, 59, 999);
}

// Late fee amount (fixed or percentage of the outstanding amount)
export function lateFeeAmount(baseAmount: number, mode: string, value: number) {
  if (!value || value <= 0 || baseAmount <= 0) return 0;
  return mode === "percentage" ? Math.round((baseAmount * value) / 100) : value;
}

export function computeVoucherDates(issue: Date, dueDay: number, validityDays: number) {
  const issueDay = new Date(issue.getFullYear(), issue.getMonth(), issue.getDate());

  let dueDate = billingDueDate(issue.getFullYear(), issue.getMonth() + 1, dueDay);
  if (issueDay > dueDate) {
    const next = new Date(issue.getFullYear(), issue.getMonth() + 1, 1);
    dueDate = billingDueDate(next.getFullYear(), next.getMonth() + 1, dueDay);
  }

  const validTill = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0, 23, 59, 59);
  validTill.setDate(validTill.getDate() + Number(validityDays || 0));

  return { dueDate, validTill };
}

// Default undertaking text for the Admission Form (schools can change it in Settings)
export const DEFAULT_UNDERTAKING =
  "I hereby confirm that all the data provided above is correct to the best of my knowledge. I shall abide by all the Campus rules and regulations.";