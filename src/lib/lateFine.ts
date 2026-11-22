import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { FeeCategoryModel } from "@/models/FeeCategory";
import Student from "@/models/Student";
import { getSchoolSettings } from "@/lib/schoolSettings";
import { billingDueDate, lateFeeAmount } from "@/lib/voucherDates";
import { pkToday } from "@/lib/pkTime";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * When "Apply" is ticked in Settings:
 * - only invoices of the "Apply from" month and later
 * - the due date has passed and that month's invoices are pending / partial
 * → ONE fine invoice for that month (never created twice)
 */
export async function applyLateFines(studentId: string) {
  const student: any = await Student.findById(studentId).select("schoolId").lean();
  if (!student) return;

  const settings = await getSchoolSettings(student.schoolId);
  const lf = settings.lateFee;
  if (!lf.autoApply || !lf.categoryId || !(lf.value > 0)) return;

  // No start month → safe default: this month (Pakistan), never older months
  const now = new Date();
  const today = pkToday();
  const startYear = Number(lf.startYear) || today.y;
  const startMonth = Number(lf.startMonth) || today.m;
  const startKey = startYear * 12 + startMonth;

  const fineCat: any = await FeeCategoryModel.findOne({
    _id: lf.categoryId,
    schoolId: student.schoolId,
  } as any).lean();
  if (!fineCat) return;

  // Unpaid invoices, except the fine invoices themselves
  const unpaid: any[] = await StudentFeeInvoice.find({
    studentId,
    status: { $in: ["pending", "partial"] },
    feeCategoryId: { $ne: fineCat._id },
  } as any)
    .select("month year remainingAmount")
    .lean();

  const overdue = new Map<string, { month: number; year: number; due: number }>();

  for (const inv of unpaid) {
    // Months before "Apply from" → skip
    if (inv.year * 12 + inv.month < startKey) continue;

    // Due day 11:59:59 PM Pakistan time
    const dueDate = billingDueDate(inv.year, inv.month, settings.voucher.dueDay);
    if (now <= dueDate) continue; // due date not passed yet

    const key = `${inv.year}-${inv.month}`;
    const g = overdue.get(key) || { month: inv.month, year: inv.year, due: 0 };
    g.due += inv.remainingAmount || 0;
    overdue.set(key, g);
  }

  for (const g of overdue.values()) {
    // This month's fine already exists → skip
    const exists = await StudentFeeInvoice.exists({
      studentId,
      feeCategoryId: fineCat._id,
      month: g.month,
      year: g.year,
    } as any);
    if (exists) continue;

    const amount = lateFeeAmount(g.due, lf.mode, lf.value);
    if (amount <= 0) continue;

    await StudentFeeInvoice.create({
      studentId,
      schoolId: student.schoolId,
      feeCategoryId: fineCat._id,
      categoryName: fineCat.name,
      month: g.month,
      year: g.year,
      title: `${fineCat.name} of ${MONTHS[g.month]} ${g.year}`,
      description: "Auto late fee (due date passed)",
      baseFee: amount,
      discount: 0,
      netPayable: amount,
      paidAmount: 0,
      remainingAmount: amount,
      status: "pending",
      paymentHistory: [],
    });
  }
}