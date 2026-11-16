import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import { ClassModel } from "@/models/Class";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { ImportBatch } from "@/models/ImportBatch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MAX_ROWS = 1000;
const ARREARS_CATEGORY = "Previous Arrears";
const MISSING_CNIC = /^missing(\d+)$/i;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
type Row = Record<string, any>;

const clean = (v: any) => String(v ?? "").replace(/\s+/g, " ").trim();
const keyOf = (v: any) => clean(v).toLowerCase();
const digits = (v: any) => String(v ?? "").replace(/\D/g, "");

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const showDate = (d: Date) => `${d.getUTCDate()} ${SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

// Strict calendar date (UTC midnight, so the day never shifts)
function makeDate(y: number, m: number, d: number) {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? dt
    : null;
}

const monthOf = (word: string) => MONTHS[word.toLowerCase().slice(0, 3)] || 0;

/**
 * Reads almost any date format:
 * 14/12/2020, 12/14/2020, 14-12-2020, 2020-12-14,
 * 14 Dec 2020, 14th Dec 2020, Dec 14 2020, December 14, 2020
 * `ambiguous` = both day and month ≤ 12 (read as day/month)
 */
function parseDateInfo(v: any): { date: Date | null; ambiguous: boolean } {
  const s = clean(v).replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  if (!s) return { date: null, ambiguous: false };

  // YYYY-MM-DD (or YYYY/MM/DD)
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return { date: makeDate(+m[1], +m[2], +m[3]), ambiguous: false };

  // a/b/YYYY — detect day/month order
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12 && b <= 12) return { date: makeDate(y, b, a), ambiguous: false }; // DD/MM
    if (b > 12 && a <= 12) return { date: makeDate(y, a, b), ambiguous: false }; // MM/DD
    return { date: makeDate(y, b, a), ambiguous: a !== b }; // both ≤ 12 → DD/MM
  }

  // 14 Dec 2020 / 14-Dec-2020 / 14 December, 2020
  m = s.match(/^(\d{1,2})[\s\-\/.]+([a-z]+)[\s\-\/.,]+(\d{2,4})$/i);
  if (m) {
    const mon = monthOf(m[2]);
    return { date: mon ? makeDate(+m[3], mon, +m[1]) : null, ambiguous: false };
  }

  // Dec 14 2020 / December 14, 2020
  m = s.match(/^([a-z]+)[\s\-.]+(\d{1,2})[\s,\-.]+(\d{2,4})$/i);
  if (m) {
    const mon = monthOf(m[1]);
    return { date: mon ? makeDate(+m[3], mon, +m[2]) : null, ambiguous: false };
  }

  return { date: null, ambiguous: false };
}

// Today's date in Pakistan time (server runs on UTC)
function todayPk() {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// null = empty, NaN = invalid
const parseAmount = (v: any): number | null => {
  const s = clean(v).replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

// 0314-4534345 / 3144534345 / +92 314 4534345 → 03144534345
function normPhone(v: any) {
  let d = digits(v);
  if (d.length === 12 && d.startsWith("92")) d = "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("3")) d = "0" + d;
  return d;
}

// 1730112345679 → 17301-1234567-9
const formatCnic = (d: string) => `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;

async function getSuperAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "super_admin" ? session : null;
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
async function loadContext(schoolId: string) {
  const [classes, classCategory, students, parents] = await Promise.all([
    (ClassModel as any).find({ schoolId }).lean(),
    (FeeCategoryModel as any).findOne({ schoolId, feeSource: "class_fee" }).lean(),
    (Student as any).find({ schoolId }).select("grNumber bFormNumber").lean(),
    (ParentModel as any).find({ schoolId }).select("cnic fullName p_id phone").lean(),
  ]);

  const parentByCnic = new Map<string, any>();
  let missingSeq = 0; // highest existing missingN

  for (const p of parents as any[]) {
    const mm = String(p.cnic || "").match(MISSING_CNIC);
    if (mm) {
      missingSeq = Math.max(missingSeq, Number(mm[1]));
    } else {
      const d = digits(p.cnic);
      if (d) parentByCnic.set(d, p);
    }
  }

  return {
    classCategory,
    classByName: new Map<string, any>(classes.map((c: any) => [keyOf(c.name), c])),
    grSet: new Set<number>(students.map((s: any) => Number(s.grNumber))),
    bformSet: new Set<string>(students.map((s: any) => digits(s.bFormNumber)).filter(Boolean)),
    parentByCnic,
    missingSeq,
  };
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

function validateRows(rows: Row[], ctx: Ctx) {
  const sheetGr = new Map<number, number>();
  const sheetBform = new Map<string, number>();
  const sheetFather = new Map<string, string>();
  const today = todayPk();

  // Reads a date column; empty → today
  const readDate = (raw: any, label: string, errors: string[], warnings: string[], warnIfEmpty = false) => {
    if (!clean(raw)) {
      if (warnIfEmpty) warnings.push(`${label} missing — today's date will be saved, please correct it later`);
      return today;
    }
    const { date, ambiguous } = parseDateInfo(raw);
    if (!date) {
      errors.push(`${label} "${clean(raw)}" could not be read`);
      return null;
    }
    if (ambiguous) warnings.push(`${label} "${clean(raw)}" read as ${showDate(date)}`);
    return date;
  };

  return rows.map((r, i) => {
    const row = Number(r.__row) || i + 2;
    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Student
    const studentName = clean(r.studentName);
    if (!studentName) errors.push("Student Name is required");

    const g = keyOf(r.gender);
    const gender = g === "male" || g === "m" ? "Male" : g === "female" || g === "f" ? "Female" : "";
    if (!gender)
      errors.push(
        clean(r.gender) ? `Gender "${clean(r.gender)}" is invalid (use Male or Female)` : "Gender is required",
      );

    const dob = readDate(r.dateOfBirth, "Date of Birth", errors, warnings, true);
    if (dob && dob > today) errors.push("Date of Birth is in the future");

    // ── Class & section
    const cls = ctx.classByName.get(keyOf(r.className));
    let section = "";
    if (!clean(r.className)) errors.push("Class is required");
    else if (!cls) errors.push(`Class "${clean(r.className)}" not found`);
    else {
      const sec = (cls.sections || []).find((s: string) => keyOf(s) === keyOf(r.section));
      if (!clean(r.section)) errors.push("Section is required");
      else if (!sec) errors.push(`Section "${clean(r.section)}" not found in ${cls.name}`);
      else section = sec;
    }

    // ── GR number (optional)
    let grNumber: number | null = null;
    if (clean(r.grNumber)) {
      const n = Number(clean(r.grNumber));
      if (!Number.isInteger(n) || n <= 0) errors.push(`GR Number "${clean(r.grNumber)}" is invalid`);
      else if (ctx.grSet.has(n)) errors.push(`GR Number ${n} already exists in this school`);
      else if (sheetGr.has(n)) errors.push(`GR Number ${n} is repeated (also row ${sheetGr.get(n)})`);
      else {
        grNumber = n;
        sheetGr.set(n, row);
      }
    }

    // ── B-Form (warning only)
    const bf = digits(r.bFormNumber);
    if (bf) {
      if (ctx.bformSet.has(bf)) warnings.push("B-Form Number already exists for another student");
      else if (sheetBform.has(bf)) warnings.push(`B-Form Number repeated (also row ${sheetBform.get(bf)})`);
      else sheetBform.set(bf, row);
    }

    // ── Admission date & status
    const admissionDate = readDate(r.admissionDate, "Admission Date", errors, warnings);

    const st = keyOf(r.status) || "active";
    const status = st === "active" ? "active" : st === "inactive" ? "inactive" : "";
    if (!status) errors.push(`Status "${clean(r.status)}" is invalid (use Active or Inactive)`);

    let inactiveDate: Date | null = null;
    if (status === "inactive") {
      inactiveDate = readDate(r.inactiveDate, "Inactive Date", errors, warnings, true);
      if (!clean(r.inactiveReason)) warnings.push("Inactive student without Inactive Reason");
    }

    // ── Father
    const fatherName = clean(r.fatherName);
    if (!fatherName) errors.push("Father Name is required");

    const fatherPhone = normPhone(r.fatherPhone);
    if (!fatherPhone) errors.push("Father Phone is required");
    else if (fatherPhone.length < 10) warnings.push(`Father Phone "${clean(r.fatherPhone)}" looks too short`);

    // CNIC: empty / text without digits → its own new parent (missing1, missing2…), never a sibling
    const cnicDigits = digits(r.fatherCnic);
    const cnicMissing = !cnicDigits;
    if (cnicMissing) {
      warnings.push("Father CNIC missing — a separate parent will be created (missing1, missing2…)");
    } else if (cnicDigits.length !== 13) {
      errors.push(`Father CNIC "${clean(r.fatherCnic)}" must have 13 digits`);
    }

    // Siblings / existing parent — by CNIC only
    let existingParent: any = null;
    if (!cnicMissing && cnicDigits.length === 13) {
      existingParent = ctx.parentByCnic.get(cnicDigits) || null;
      if (existingParent && keyOf(existingParent.fullName) !== keyOf(fatherName))
        warnings.push(
          `Linked to existing parent "${existingParent.fullName}" (P-ID ${existingParent.p_id}) — names differ`,
        );

      const prevName = sheetFather.get(cnicDigits);
      if (prevName && prevName !== keyOf(fatherName))
        warnings.push("Same Father CNIC is used with a different Father Name in this sheet");
      if (!prevName) sheetFather.set(cnicDigits, keyOf(fatherName));
    }

    // ── Fees
    const classFee = Number(cls?.classFee) || 0;
    let monthlyFee = classFee;
    const mf = parseAmount(r.monthlyFee);
    if (mf !== null) {
      if (Number.isNaN(mf) || mf < 0) errors.push(`Monthly Fee "${clean(r.monthlyFee)}" is invalid`);
      else if (cls && classFee > 0 && mf > classFee)
        errors.push(`Monthly Fee ${mf} is more than the class fee ${classFee}`);
      else monthlyFee = mf;
    }
    if (cls && classFee <= 0) warnings.push(`Class fee is not set for ${cls.name} — monthly fee will not be locked`);

    let arrears = 0;
    const ar = parseAmount(r.arrears);
    if (ar !== null) {
      if (Number.isNaN(ar) || ar < 0) errors.push(`Previous Arrears "${clean(r.arrears)}" is invalid`);
      else arrears = ar;
    }

    return {
      row,
      status: errors.length ? "error" : warnings.length ? "warning" : "ok",
      errors,
      warnings,
      preview: {
        grNumber: grNumber ?? "",
        studentName,
        className: cls ? `${cls.name}${section ? ` (${section})` : ""}` : clean(r.className),
        fatherName,
        fatherCnic: cnicMissing
          ? "missing (auto)"
          : cnicDigits.length === 13
            ? formatCnic(cnicDigits)
            : clean(r.fatherCnic),
        monthlyFee,
        arrears,
        linkedParent: !!existingParent,
      },
      data: errors.length
        ? null
        : {
            grNumber,
            student: {
              fullName: studentName,
              image: gender === "Female" ? "/studentfemale-avatar.jpg" : "/studentmale-avatar.jpg",
              gender,
              dateOfBirth: dob,
              placeOfBirth: clean(r.placeOfBirth),
              bFormNumber: clean(r.bFormNumber),
              cast: clean(r.caste),
              religion: clean(r.religion) || "Islam",
              nationality: clean(r.nationality) || "Pakistani",
              classId: cls._id,
              section,
              enrollmentDate: admissionDate,
              status,
              inactiveDate: inactiveDate || undefined,
              inactiveReason: clean(r.inactiveReason),
              previousSchool: clean(r.previousSchool),
              motherName: clean(r.motherName),
              motherProfession: clean(r.motherProfession),
              motherPhone: normPhone(r.motherPhone),
              guardianName: clean(r.guardianName),
              guardianRelation: clean(r.guardianRelation),
              guardianPhone: normPhone(r.guardianPhone),
              detailedNote: clean(r.remarks),
            },
            parent: {
              cnicMissing,
              cnicDigits,
              fullName: fatherName,
              cnic: cnicMissing ? "" : formatCnic(cnicDigits),
              phone: fatherPhone,
              occupation: clean(r.fatherOccupation),
              address: clean(r.address),
            },
            classFee,
            monthlyFee,
            arrears,
          },
    };
  });
}

// "Previous Arrears" category (created once per school)
async function ensureArrearsCategory(schoolId: string) {
  const existing = await (FeeCategoryModel as any)
    .findOne({ schoolId, name: ARREARS_CATEGORY })
    .lean();
  if (existing) return existing;
  return (FeeCategoryModel as any).create({
    schoolId,
    name: ARREARS_CATEGORY,
    isMonthly: false,
    maxBaseFee: 0,
    feeSource: "fixed",
  });
}

// ─────────────────────────────────────────────────────────────
// GET → import history
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await connectDB();
    if (!(await getSuperAdmin()))
      return NextResponse.json({ message: "Only Super Admin can import students" }, { status: 403 });

    const schoolId = new URL(req.url).searchParams.get("schoolId");
    if (!schoolId) return NextResponse.json([]);

    const batches: any[] = await (ImportBatch as any)
      .find({ schoolId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(
      batches.map((b) => ({
        _id: String(b._id),
        fileName: b.fileName,
        createdBy: b.createdBy,
        createdAt: b.createdAt,
        totalRows: b.totalRows,
        students: b.studentIds?.length || 0,
        parents: b.parentIds?.length || 0,
        failed: b.failed?.length || 0,
        status: b.status,
        undoneAt: b.undoneAt,
      })),
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST → { action: "validate" | "import" }
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getSuperAdmin();
    if (!session)
      return NextResponse.json({ message: "Only Super Admin can import students" }, { status: 403 });

    const body = await req.json();
    const schoolId = String(body.schoolId || "");
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];

    if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });
    if (rows.length === 0) return NextResponse.json({ message: "No rows found" }, { status: 400 });
    if (rows.length > MAX_ROWS)
      return NextResponse.json({ message: `Maximum ${MAX_ROWS} rows per file` }, { status: 400 });

    const ctx = await loadContext(schoolId);
    const globalErrors: string[] = [];
    if (!ctx.classCategory)
      globalErrors.push(
        'No "Class Fee" fee category found. Create a fee category with "Amount comes from Class Fee" first.',
      );

    const results = validateRows(rows, ctx);

    // ── Validate only (nothing is saved)
    if (body.action === "validate") {
      return NextResponse.json({
        globalErrors,
        results: results.map(({ data, ...r }) => r),
      });
    }

    // ── Import
    if (body.action !== "import")
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    if (globalErrors.length)
      return NextResponse.json({ message: globalErrors[0] }, { status: 400 });

    const invalid = results.filter((r) => r.status === "error");
    if (invalid.length && !body.onlyValid)
      return NextResponse.json(
        { message: `${invalid.length} row(s) have errors. Fix them or import valid rows only.` },
        { status: 400 },
      );

    // First chunk creates the batch; next chunks add to it
    let batch: any = body.batchId
      ? await (ImportBatch as any).findOne({ _id: body.batchId, schoolId })
      : await (ImportBatch as any).create({
          schoolId,
          fileName: clean(body.fileName),
          createdBy: session.user?.email || session.user?.name || "",
          totalRows: Number(body.totalRows) || rows.length,
        });
    if (!batch) return NextResponse.json({ message: "Import batch not found" }, { status: 404 });

    let arrearsCategory: any = null;
    const today = todayPk(); // month/year of the arrears invoice in Pakistan time
    let imported = 0;
    const failed: { row: number; message: string }[] = [];

    for (const r of results) {
      if (!r.data) {
        failed.push({ row: r.row, message: r.errors.join("; ") });
        continue;
      }
      const d = r.data;
      let studentId: any = null;

      try {
        // 1. Parent: reuse by CNIC; missing CNIC → always a new, separate parent
        let parentDoc: any = d.parent.cnicMissing ? null : ctx.parentByCnic.get(d.parent.cnicDigits);

        if (!parentDoc) {
          const cnic = d.parent.cnicMissing ? `missing${++ctx.missingSeq}` : d.parent.cnic;
          parentDoc = await (ParentModel as any).create({
            schoolId,
            fullName: d.parent.fullName,
            cnic,
            phone: d.parent.phone,
            occupation: d.parent.occupation,
            address: d.parent.address,
            gender: "Male",
          });
          batch.parentIds.push(parentDoc._id);
          // Siblings in later rows (same CNIC) reuse this parent
          if (!d.parent.cnicMissing) ctx.parentByCnic.set(d.parent.cnicDigits, parentDoc);
        }

        // 2. Student (GR from sheet or auto)
        const student = await (Student as any).create({
          ...d.student,
          ...(d.grNumber ? { grNumber: d.grNumber } : {}),
          schoolId,
          parentId: parentDoc._id,
        });
        studentId = student._id;

        // 3. Monthly fee lock (base = class fee, net = sheet fee)
        if (ctx.classCategory && d.classFee > 0) {
          await (FeeDiscount as any).findOneAndUpdate(
            { studentId: student._id, feeCategoryId: ctx.classCategory._id },
            {
              $set: {
                studentId: student._id,
                schoolId,
                feeCategoryId: ctx.classCategory._id,
                baseFee: d.classFee,
                customNetFee: d.monthlyFee,
                discountType: "fixed",
                discountValue: d.classFee - d.monthlyFee,
                remarks: "Imported fee",
              },
            },
            { upsert: true },
          );
        }

        // 4. Previous arrears → one pending invoice
        if (d.arrears > 0) {
          if (!arrearsCategory) arrearsCategory = await ensureArrearsCategory(schoolId);
          await (StudentFeeInvoice as any).create({
            studentId: student._id,
            schoolId,
            feeCategoryId: arrearsCategory._id,
            categoryName: ARREARS_CATEGORY,
            month: today.getUTCMonth() + 1,
            year: today.getUTCFullYear(),
            title: ARREARS_CATEGORY,
            description: "Opening balance (imported)",
            baseFee: d.arrears,
            discount: 0,
            netPayable: d.arrears,
            paidAmount: 0,
            remainingAmount: d.arrears,
            status: "pending",
          });
        }

        batch.studentIds.push(student._id);
        imported++;
      } catch (e: any) {
        // Roll back this row only
        if (studentId) {
          await (FeeDiscount as any).deleteMany({ studentId });
          await (StudentFeeInvoice as any).deleteMany({ studentId });
          await (Student as any).deleteOne({ _id: studentId });
        }
        failed.push({ row: r.row, message: e.message || "Failed to save" });
      }
    }

    batch.failed.push(...failed);
    await batch.save();

    return NextResponse.json({ batchId: String(batch._id), imported, failed });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE → undo one import
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    await connectDB();
    if (!(await getSuperAdmin()))
      return NextResponse.json({ message: "Only Super Admin can undo imports" }, { status: 403 });

    const { schoolId, batchId } = await req.json();
    const batch: any = await (ImportBatch as any).findOne({ _id: batchId, schoolId });
    if (!batch) return NextResponse.json({ message: "Import not found" }, { status: 404 });
    if (batch.status === "undone")
      return NextResponse.json({ message: "This import is already undone" }, { status: 400 });

    const ids = batch.studentIds || [];

    // Safety: never undo once payments exist
    const paid = await (StudentFeeInvoice as any).countDocuments({
      studentId: { $in: ids },
      $or: [{ paidAmount: { $gt: 0 } }, { "paymentHistory.0": { $exists: true } }],
    });
    if (paid)
      return NextResponse.json(
        { message: `Cannot undo — payments are recorded for ${paid} invoice(s) of these students.` },
        { status: 409 },
      );

    await (StudentFeeInvoice as any).deleteMany({ studentId: { $in: ids } });
    await (FeeDiscount as any).deleteMany({ studentId: { $in: ids } });
    const removed = await (Student as any).deleteMany({ _id: { $in: ids }, schoolId });

    // Parents created by this import that no longer have any student
    const stillUsed: any[] = await (Student as any).distinct("parentId", {
      parentId: { $in: batch.parentIds },
    });
    const usedSet = new Set(stillUsed.map(String));
    const removableParents = batch.parentIds.filter((id: any) => !usedSet.has(String(id)));
    await (ParentModel as any).deleteMany({ _id: { $in: removableParents }, schoolId });

    batch.status = "undone";
    batch.undoneAt = new Date();
    await batch.save();

    return NextResponse.json({
      message: "Import undone",
      students: removed.deletedCount || 0,
      parents: removableParents.length,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}