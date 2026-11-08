import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { FeeCategoryModel } from "@/models/FeeCategory";
import Student from "@/models/Student";
import {
  getSchoolSettings,
  billingDueDate,
  lateFeeAmount,
} from "@/lib/schoolSettings";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Settings mein "Apply" tick ho to:
 * - sirf "Apply from" mahine aur us ke baad ki invoices
 * - due date guzar jaye aur us mahine ki invoices pending/partial hon
 * → us mahine ka EK fine invoice banao (dobara nahi banega)
 */
export async function applyLateFines(studentId: string) {
  const student: any = await Student.findById(studentId).select("schoolId").lean();
  if (!student) return;

  const settings = await getSchoolSettings(student.schoolId);
  const lf = settings.lateFee;
  if (!lf.autoApply || !lf.categoryId || !(lf.value > 0)) return;

  // Start month na ho to safe default: is mahine se (purane mahine kabhi nahi)
  const now = new Date();
  const startYear = Number(lf.startYear) || now.getFullYear();
  const startMonth = Number(lf.startMonth) || now.getMonth() + 1;
  const startKey = startYear * 12 + startMonth;

  const fineCat: any = await FeeCategoryModel.findOne({
    _id: lf.categoryId,
    schoolId: student.schoolId,
  } as any).lean();
  if (!fineCat) return;

  // Fine wali invoices ko chhod kar baqi unpaid invoices
  const unpaid: any[] = await StudentFeeInvoice.find({
    studentId,
    status: { $in: ["pending", "partial"] },
    feeCategoryId: { $ne: fineCat._id },
  } as any)
    .select("month year remainingAmount")
    .lean();

  const overdue = new Map<string, { month: number; year: number; due: number }>();

  for (const inv of unpaid) {
    // "Apply from" se pehle ke mahine → skip
    if (inv.year * 12 + inv.month < startKey) continue;

    const dueDate = billingDueDate(inv.year, inv.month, settings.voucher.dueDay);
    if (now <= dueDate) continue; // abhi due date nahi guzri

    const key = `${inv.year}-${inv.month}`;
    const g = overdue.get(key) || { month: inv.month, year: inv.year, due: 0 };
    g.due += inv.remainingAmount || 0;
    overdue.set(key, g);
  }

  for (const g of overdue.values()) {
    // Is mahine ka fine pehle se hai? → skip
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