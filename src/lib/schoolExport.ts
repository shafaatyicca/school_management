// School data as a readable Excel file (handover) — one sheet per kind of data
import * as XLSX from "xlsx";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import Employee from "@/models/Employee";
import { ClassModel } from "@/models/Class";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { UserModel } from "@/models/User";
import { schoolFilter } from "@/lib/dataLinks";
import { toYMD } from "@/lib/pkTime";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (v: any) => (v ? toYMD(v) : "");
const txt = (v: any) => (v === null || v === undefined ? "" : v);
const key = (v: any) => (v ? String(v) : "");

// Rows → sheet with readable column widths
function sheetOf(rows: any[], headers: string[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => {
    const longest = rows.reduce((m, r) => Math.max(m, String(r[h] ?? "").length), h.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 45) };
  });
  return ws;
}

export async function schoolExcel(schoolId: string, school: any): Promise<Buffer> {
  const f = schoolFilter(schoolId);
  const all = (model: any) => model.collection.find(f).toArray();

  const [classes, parents, students, employees, categories, discounts, invoices] = await Promise.all([
    all(ClassModel),
    all(ParentModel),
    all(Student),
    all(Employee),
    all(FeeCategoryModel),
    all(FeeDiscount),
    all(StudentFeeInvoice),
  ]);

    const classById = new Map<string, any>(classes.map((c: any) => [key(c._id), c]));
  const parentById = new Map<string, any>(parents.map((p: any) => [key(p._id), p]));
  const studentById = new Map<string, any>(students.map((s: any) => [key(s._id), s]));
  const catById = new Map<string, any>(categories.map((c: any) => [key(c._id), c]));

  // Who received each payment (names only)
  const userIds = new Set<string>();
  for (const inv of invoices) for (const p of inv.paymentHistory || []) if (p.receivedBy) userIds.add(key(p.receivedBy));
  const users: any[] = userIds.size
    ? await (UserModel as any).find({ _id: { $in: [...userIds] } }).select("name").lean()
    : [];
  const userName = new Map(users.map((u: any) => [key(u._id), u.name]));

  // Counts
  const childrenOf = new Map<string, number>();
  const studentsInClass = new Map<string, number>();
  for (const s of students) {
    childrenOf.set(key(s.parentId), (childrenOf.get(key(s.parentId)) || 0) + 1);
    studentsInClass.set(key(s.classId), (studentsInClass.get(key(s.classId)) || 0) + 1);
  }

  const studentCols = (s: any) => ({
    "GR #": txt(s?.grNumber),
    Student: txt(s?.fullName),
    Class: txt(classById.get(key(s?.classId))?.name),
    Section: txt(s?.section),
  });

  const wb = XLSX.utils.book_new();

  // School
  XLSX.utils.book_append_sheet(
    wb,
    sheetOf(
      [
        {
          Name: txt(school.name),
          Slug: txt(school.slug),
          Address: txt(school.address),
          Phone: txt(school.phone),
          Status: txt(school.status),
          "Joining Date": day(school.joiningDate),
          "Expiry Date": day(school.expiryDate),
          "Exported On": toYMD(),
        },
      ],
      ["Name", "Slug", "Address", "Phone", "Status", "Joining Date", "Expiry Date", "Exported On"],
    ),
    "School",
  );

  // Students
  const stHeaders = [
    "GR #", "Full Name", "Gender", "Date of Birth", "B-Form / CNIC", "Class", "Section",
    "Enrollment Date", "Status", "Inactive Date", "Inactive Reason",
    "Father Name", "Father CNIC", "Father Phone", "Address",
    "Mother Name", "Mother Profession", "Mother Phone",
    "Guardian Name", "Guardian Relation", "Guardian Phone",
    "Religion", "Nationality", "Caste", "Place of Birth", "Previous School", "Remarks",
  ];
  const stRows = [...students]
    .sort((a, b) => (a.grNumber || 0) - (b.grNumber || 0))
    .map((s) => {
      const p = parentById.get(key(s.parentId));
      return {
        "GR #": txt(s.grNumber),
        "Full Name": txt(s.fullName),
        Gender: txt(s.gender),
        "Date of Birth": day(s.dateOfBirth),
        "B-Form / CNIC": txt(s.bFormNumber),
        Class: txt(classById.get(key(s.classId))?.name),
        Section: txt(s.section),
        "Enrollment Date": day(s.enrollmentDate),
        Status: txt(s.status),
        "Inactive Date": day(s.inactiveDate),
        "Inactive Reason": txt(s.inactiveReason),
        "Father Name": txt(p?.fullName),
        "Father CNIC": txt(p?.cnic),
        "Father Phone": txt(p?.phone),
        Address: txt(p?.address),
        "Mother Name": txt(s.motherName),
        "Mother Profession": txt(s.motherProfession),
        "Mother Phone": txt(s.motherPhone),
        "Guardian Name": txt(s.guardianName),
        "Guardian Relation": txt(s.guardianRelation),
        "Guardian Phone": txt(s.guardianPhone),
        Religion: txt(s.religion),
        Nationality: txt(s.nationality),
        Caste: txt(s.cast),
        "Place of Birth": txt(s.placeOfBirth),
        "Previous School": txt(s.previousSchool),
        Remarks: txt(s.detailedNote),
      };
    });
  XLSX.utils.book_append_sheet(wb, sheetOf(stRows, stHeaders), "Students");

  // Parents
  const paHeaders = ["P-ID", "Full Name", "CNIC", "Phone", "Gender", "Occupation", "Address", "Children"];
  const paRows = [...parents]
    .sort((a, b) => (a.p_id || 0) - (b.p_id || 0))
    .map((p) => ({
      "P-ID": txt(p.p_id),
      "Full Name": txt(p.fullName),
      CNIC: txt(p.cnic),
      Phone: txt(p.phone),
      Gender: txt(p.gender),
      Occupation: txt(p.occupation),
      Address: txt(p.address),
      Children: childrenOf.get(key(p._id)) || 0,
    }));
  XLSX.utils.book_append_sheet(wb, sheetOf(paRows, paHeaders), "Parents");

  // Employees
  const emHeaders = [
    "ID", "Full Name", "Designation", "Category", "Gender", "Phone", "CNIC", "Qualification",
    "Subject", "Experience (Years)", "Salary", "Date of Birth", "Joining Date", "Status",
    "Leaving Date", "Leaving Reason", "Address", "Emergency Name", "Emergency Phone", "Emergency Relation",
  ];
  const emRows = [...employees]
    .sort((a, b) => (a.emp_id || 0) - (b.emp_id || 0))
    .map((e) => ({
      ID: txt(e.emp_id),
      "Full Name": txt(e.fullName),
      Designation: txt(e.designation),
      Category: txt(e.staffCategory),
      Gender: txt(e.gender),
      Phone: txt(e.phone),
      CNIC: txt(e.nicNumber),
      Qualification: txt(e.qualification),
      Subject: txt(e.subject),
      "Experience (Years)": txt(e.experience),
      Salary: txt(e.salary),
      "Date of Birth": day(e.dateOfBirth),
      "Joining Date": day(e.joiningDate),
      Status: txt(e.status),
      "Leaving Date": day(e.inactiveDate),
      "Leaving Reason": txt(e.inactiveReason),
      Address: txt(e.address),
      "Emergency Name": txt(e.emergencyContact?.name),
      "Emergency Phone": txt(e.emergencyContact?.phone),
      "Emergency Relation": txt(e.emergencyContact?.relation),
    }));
  XLSX.utils.book_append_sheet(wb, sheetOf(emRows, emHeaders), "Employees");

  // Classes
  const clHeaders = ["Class", "Sections", "Class Fee", "Students"];
  const clRows = [...classes]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((c) => ({
      Class: txt(c.name),
      Sections: (c.sections || []).join(", "),
      "Class Fee": txt(c.classFee),
      Students: studentsInClass.get(key(c._id)) || 0,
    }));
  XLSX.utils.book_append_sheet(wb, sheetOf(clRows, clHeaders), "Classes");

  // Fee categories
  const fcHeaders = ["Category", "Monthly", "Base Fee", "Fee Source"];
  const fcRows = categories.map((c: any) => ({
    Category: txt(c.name),
    Monthly: c.isMonthly ? "Yes" : "No",
    "Base Fee": txt(c.maxBaseFee),
    "Fee Source": c.feeSource === "class_fee" ? "Class Fee" : "Fixed",
  }));
  XLSX.utils.book_append_sheet(wb, sheetOf(fcRows, fcHeaders), "Fee Categories");

  // Discounts
  const diHeaders = ["GR #", "Student", "Class", "Section", "Category", "Base Fee", "Discount", "Net Fee", "Type", "Remarks"];
  const diRows = discounts.map((d: any) => ({
    ...studentCols(studentById.get(key(d.studentId))),
    Category: txt(catById.get(key(d.feeCategoryId))?.name),
    "Base Fee": txt(d.baseFee),
    Discount: Math.max(0, (d.baseFee || 0) - (d.customNetFee || 0)),
    "Net Fee": txt(d.customNetFee),
    Type: txt(d.discountType),
    Remarks: txt(d.remarks),
  }));
  XLSX.utils.book_append_sheet(wb, sheetOf(diRows, diHeaders), "Discounts");

  // Invoices + Payments
  const inHeaders = [
    "GR #", "Student", "Class", "Section", "Invoice", "Category", "Month", "Date",
    "Base Fee", "Discount", "Net Payable", "Paid", "Remaining", "Status",
  ];
  const pyHeaders = ["Receipt No", "Paid Date", "GR #", "Student", "Class", "Section", "Invoice", "Amount", "Method", "Received By", "Note"];
  const inRows: any[] = [];
  const pyRows: any[] = [];

  const sortedInvoices = [...invoices].sort(
    (a, b) => (a.year - b.year) || (a.month - b.month) || ((studentById.get(key(a.studentId))?.grNumber || 0) - (studentById.get(key(b.studentId))?.grNumber || 0)),
  );

  for (const inv of sortedInvoices) {
    const st = studentById.get(key(inv.studentId));
    const title = inv.title || `${inv.categoryName} ${MONTHS[inv.month - 1] || inv.month} ${inv.year}`;
    inRows.push({
      ...studentCols(st),
      Invoice: title,
      Category: txt(inv.categoryName),
      Month: `${MONTHS[inv.month - 1] || inv.month} ${inv.year}`,
      Date: day(inv.createdAt),
      "Base Fee": txt(inv.baseFee),
      Discount: txt(inv.discount),
      "Net Payable": txt(inv.netPayable),
      Paid: txt(inv.paidAmount),
      Remaining: txt(inv.remainingAmount),
      Status: txt(inv.status),
    });
    for (const p of inv.paymentHistory || []) {
      pyRows.push({
        "Receipt No": txt(p.paymentNo),
        "Paid Date": day(p.paidDate),
        ...studentCols(st),
        Invoice: title,
        Amount: txt(p.amount),
        Method: txt(p.method),
        "Received By": txt(userName.get(key(p.receivedBy))),
        Note: txt(p.note),
      });
    }
  }
  pyRows.sort((a, b) => String(a["Paid Date"]).localeCompare(String(b["Paid Date"])));

  XLSX.utils.book_append_sheet(wb, sheetOf(inRows, inHeaders), "Invoices");
  XLSX.utils.book_append_sheet(wb, sheetOf(pyRows, pyHeaders), "Payments");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}