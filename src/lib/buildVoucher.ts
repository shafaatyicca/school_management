import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { SchoolModel } from "@/models/School";
import Student from "@/models/Student";
import "@/models/Class";
import "@/models/Parent";
import { applyLateFines } from "@/lib/lateFine";
import { getSchoolSettings, MAX_VOUCHER_ITEMS } from "@/lib/schoolSettings";
import { computeVoucherDates, lateFeeAmount } from "@/lib/voucherDates";

// Sort by GR number (numeric when possible)
const byGr = (a: any, b: any) => {
  const x = Number(a.student.grNumber);
  const y = Number(b.student.grNumber);
  if (isNaN(x) || isNaN(y))
    return String(a.student.grNumber).localeCompare(String(b.student.grNumber));
  return x - y;
};

/**
 * Builds voucher data for one or many students.
 * Only students with pending / partial invoices get a voucher.
 * Used by both the ledger "Print Voucher" button and the bulk Fee Voucher page.
 */
export async function buildVouchers(
  schoolId: string,
  studentIds: string[],
  issueDate: Date,
) {
  const ids = [...new Set(studentIds.map(String))];

  // Apply late fines first (one by one to avoid duplicate fines)
  for (const id of ids) await applyLateFines(id);

  const [school, settings, students, invoices] = await Promise.all([
    (SchoolModel as any).findById(schoolId).select("name address logo").lean(),
    getSchoolSettings(schoolId),
    Student.find({ _id: { $in: ids }, schoolId } as any)
      .populate("classId", "name")
      .populate("parentId", "fullName p_id")
      .lean(),
    StudentFeeInvoice.find({
      studentId: { $in: ids },
      schoolId,
      status: { $in: ["pending", "partial"] },
    } as any)
      .sort({ year: 1, month: 1, createdAt: 1 })
      .lean(),
  ]);

  const { dueDate, validTill } = computeVoucherDates(
    issueDate,
    settings.voucher.dueDay,
    settings.voucher.validityDays,
  );
  const mm = String(dueDate.getMonth() + 1).padStart(2, "0");
  const prefix = settings.voucher.prefix || "V";
  const maxItems = Math.min(
    MAX_VOUCHER_ITEMS,
    Math.max(1, Number(settings.voucher.maxItems) || 10),
  );

  // Group invoices by student
  const invoicesByStudent = new Map<string, any[]>();
  for (const inv of invoices as any[]) {
    const key = String(inv.studentId);
    if (!invoicesByStudent.has(key)) invoicesByStudent.set(key, []);
    invoicesByStudent.get(key)!.push(inv);
  }
  const studentMap = new Map((students as any[]).map((s) => [String(s._id), s]));

  const schoolInfo = {
    name: (school as any)?.name || "",
    address: (school as any)?.address || "",
    logo: (school as any)?.logo || "",
    phone: settings.phone,
  };
  const printSettings = {
    copies: settings.voucher.copies,
    note: settings.voucher.note,
    bank: settings.bank,
  };

  const vouchers: any[] = [];
  let skipped = 0;

  for (const id of ids) {
    const s: any = studentMap.get(id);
    const studentInvoices = invoicesByStudent.get(id) || [];
    if (!s || studentInvoices.length === 0) {
      skipped++;
      continue;
    }

    const allItems = studentInvoices.map((inv) => ({
      title: inv.title || inv.categoryName,
      amount: inv.remainingAmount || 0,
    }));

    // Over the limit → first (limit - 1) lines, rest merged into the last line
    let items = allItems;
    if (allItems.length > maxItems) {
      const shown = allItems.slice(0, maxItems - 1);
      const rest = allItems.slice(maxItems - 1);
      items = [
        ...shown,
        {
          title: `Other Dues (${rest.length} invoices)`,
          amount: rest.reduce((sum, i) => sum + i.amount, 0),
        },
      ];
    }

    // Totals always from ALL invoices
    const withinDue = allItems.reduce((sum, i) => sum + i.amount, 0);
    const lateFee = lateFeeAmount(withinDue, settings.lateFee.mode, settings.lateFee.value);

    vouchers.push({
      studentId: id,
      school: schoolInfo,
      settings: printSettings,
      student: {
        name: s.fullName,
        grNumber: s.grNumber,
        className: s.classId?.name || "",
        section: s.section || "",
        parentName: s.parentId?.fullName || "",
        familyId: s.parentId?.p_id ?? "",
      },
      voucherId: `${prefix}-${s.grNumber}-${mm}${dueDate.getFullYear()}`,
      issueDate,
      dueDate,
      validTill,
      items,
      withinDue,
      lateFee,
      afterDue: withinDue + lateFee,
    });
  }

  vouchers.sort(byGr);
  return { vouchers, skipped };
}