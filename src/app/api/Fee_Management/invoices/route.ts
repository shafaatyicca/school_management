import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor, logActivity } from "@/lib/access";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { ensureTuitionLock } from "@/lib/feeLock";
import { applyLateFines } from "@/lib/lateFine";
import { toYMD } from "@/lib/pkTime";

const M = (model: any) => model as any; // avoids Mongoose union-type errors
const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));

const unauthorized = () => NextResponse.json({ message: "Unauthorized" }, { status: 401 });
const denied = (what: string) =>
  NextResponse.json({ message: `You don't have permission to ${what}` }, { status: 403 });
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const period = (m: number, y: number) => `${MONTHS[m - 1] || m} ${y}`;

// ── Invoice date helpers (Pakistan days)
const DAY = 24 * 60 * 60 * 1000;
const PK_OFFSET = 5 * 60 * 60 * 1000;

// "2026-11-20" (or any date string) → Pakistan day "YYYY-MM-DD", "" if invalid
function toPkDay(v: any): string {
  if (!v) return "";
  const raw = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return isNaN(Date.parse(`${raw}T00:00:00+05:00`)) ? "" : raw;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : toYMD(d);
}

// That Pakistan day, keeping the time of day of `timeFrom`
function onPkDay(ymd: string, timeFrom: Date) {
  const timeOfDay = (timeFrom.getTime() + PK_OFFSET) % DAY;
  return new Date(Date.parse(`${ymd}T00:00:00+05:00`) + timeOfDay);
}

// ─────────────────────────────────────────────────────────────
// GET — invoices of this school (?studentId= &month= &year=)
// ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return unauthorized();

    const canRead =
      access.can("fees", "view") ||
      access.can("vouchers", "view") ||
      access.can("invoices", "create") ||
      access.can("invoices", "edit") ||
      access.can("invoices", "delete") ||
      access.can("takePayment", "create");
    if (!canRead) return denied("view invoices");

    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));
    if (!schoolId || !isOid(schoolId)) return bad("School not found");

    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const filter: any = { schoolId };

    if (studentId) {
      if (!isOid(studentId)) return bad("Invalid student");
      const student = await M(Student).exists({ _id: studentId, schoolId });
      if (!student) return bad("Student not found", 404);
      await applyLateFines(studentId);
      filter.studentId = studentId;
    }
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const invoices = await M(StudentFeeInvoice)
      .find(filter)
      .populate("paymentHistory.receivedBy", "name")
      .sort({ year: -1, month: -1 });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("Invoices GET error:", error?.message);
    return bad("Failed to load invoices", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// POST — generate an invoice
// ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return unauthorized();
    if (!access.can("invoices", "create")) return denied("create invoices");

    await connectDB();
    const body = await req.json().catch(() => null);
    const { studentId, month, year, feeCategoryId, title, amount, description, date } = body || {};

    const schoolId = schoolIdFor(access, body?.schoolId);
    if (!schoolId || !isOid(schoolId)) return bad("School not found");

    const m = Number(month);
    const y = Number(year);
    if (!studentId || !feeCategoryId || !m || !y) return bad("All fields are required");
    if (!isOid(studentId) || !isOid(feeCategoryId)) return bad("Invalid student or fee category");
    if (m < 1 || m > 12 || y < 2000 || y > 2100) return bad("Invalid month or year");

    // Invoice date (past or future allowed; empty → today)
    const invoiceDay = toPkDay(date);
    if (date && !invoiceDay) return bad("Invalid date");

    // Student and category must belong to this school
    const student: any = await M(Student).findOne({ _id: studentId, schoolId }).populate("classId");
    const category: any = await M(FeeCategoryModel).findById(feeCategoryId);
    if (!student || !category || (category.schoolId && String(category.schoolId) !== schoolId)) {
      return bad("Student or fee category not found", 404);
    }

    // Duplicate check
    const existing = await M(StudentFeeInvoice).exists({
      schoolId,
      studentId,
      month: m,
      year: y,
      feeCategoryId,
    });
    if (existing) return bad("An invoice for this category and month already exists", 409);

    const isClassFee = category.feeSource === "class_fee";

    // Tuition: make sure the fee is locked (in case the ledger was never opened)
    if (isClassFee) await ensureTuitionLock(studentId);

    const discount: any = await M(FeeDiscount).findOne({ studentId, feeCategoryId });

    // Amount logic
    //  1) User typed an amount → use it (discount skipped), never more than the base fee
    //  2) No amount + discount / locked fee record → use the discount
    //  3) Tuition (class fee) → class fee (unchanged)
    //  4) Otherwise → category base fee
    const maxFee = Number(category.maxBaseFee) || 0;
    const given = Number(amount);
    const hasAmount = amount !== undefined && amount !== null && amount !== "";
    if (hasAmount && (isNaN(given) || given < 0)) return bad("Invalid amount");

    const useCustom = !isClassFee && hasAmount && given > 0;

    let baseFee: number;
    let netPayable: number;

    if (useCustom) {
      const limit = maxFee > 0 ? maxFee : Number(discount?.baseFee) || 0;
      if (limit > 0 && given > limit) {
        return bad(`Amount cannot be more than the base fee (Rs. ${limit.toLocaleString("en-US")})`);
      }
      baseFee = given;
      netPayable = given;
    } else if (discount) {
      baseFee = discount.baseFee || 0;
      netPayable = discount.customNetFee ?? baseFee;
    } else if (isClassFee) {
      baseFee = student.classId?.classFee || 0;
      netPayable = baseFee;
    } else {
      baseFee = maxFee;
      netPayable = maxFee;
    }

    const discountAmount = Math.max(0, baseFee - netPayable);
    const cleanTitle = title ? String(title).trim() : "";

    const invoice = await M(StudentFeeInvoice).create({
      studentId,
      schoolId,
      feeCategoryId,
      categoryName: category.name,
      month: m,
      year: y,
      title: cleanTitle,
      description: description ? String(description).trim() : "",
      baseFee,
      discount: discountAmount,
      netPayable,
      paidAmount: 0,
      remainingAmount: netPayable,
      status: "pending",
      paymentHistory: [],
    });

    // Selected date (not today) → set it (Mongoose locks createdAt, so set it directly)
    const result: any = invoice.toObject();
    if (invoiceDay && invoiceDay !== toYMD(invoice.createdAt)) {
      const newDate = onPkDay(invoiceDay, new Date());
      await M(StudentFeeInvoice).collection.updateOne(
        { _id: invoice._id },
        { $set: { createdAt: newDate } },
      );
      result.createdAt = newDate;
    }

    logActivity(access, req, {
      action: "create",
      module: "invoices",
      schoolId,
      entityId: String(invoice._id),
      entityLabel: `${student.fullName} (GR ${student.grNumber ?? "-"})`,
      summary: `Created invoice "${cleanTitle || `${category.name} ${period(m, y)}`}" — Rs. ${netPayable.toLocaleString("en-US")}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Invoices POST error:", error?.message);
    return bad("Failed to create invoice", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH — edit title, date, month, year, description + this invoice's discount
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return unauthorized();
    if (!access.can("invoices", "edit")) return denied("edit invoices");

    await connectDB();
    const body = await req.json().catch(() => null);
    const { invoiceId, discount, title, date, month, year, description } = body || {};
    if (!invoiceId || !isOid(invoiceId)) return bad("Invoice ID is required");

    const invoice: any = await M(StudentFeeInvoice).findById(invoiceId);
    if (!invoice) return bad("Invoice not found", 404);

    // Must be this user's school (Super Admin: any school)
    const schoolId = schoolIdFor(access, String(invoice.schoolId));
    if (!schoolId || String(invoice.schoolId) !== schoolId) return bad("Invoice not found", 404);

    // Old values for the log
    const before = {
      title: invoice.title || "",
      month: invoice.month,
      year: invoice.year,
      discount: invoice.discount || 0,
      description: invoice.description || "",
      date: invoice.createdAt ? toYMD(invoice.createdAt) : "",
    };

    // Discount (not sent → keep the current one)
    const d =
      discount === undefined || discount === null || discount === ""
        ? invoice.discount || 0
        : Number(discount);
    if (isNaN(d) || d < 0 || d > invoice.baseFee) {
      return bad(`Discount must be between 0 and ${invoice.baseFee}`);
    }

    const newNet = invoice.baseFee - d;
    if (newNet < invoice.paidAmount) {
      return bad(`Rs. ${invoice.paidAmount} has already been paid on this invoice`);
    }

    // Month / Year (if changed → duplicate check)
    const newMonth = month ? Number(month) : invoice.month;
    const newYear = year ? Number(year) : invoice.year;
    if (newMonth < 1 || newMonth > 12 || newYear < 2000 || newYear > 2100) {
      return bad("Invalid month or year");
    }

    if (newMonth !== invoice.month || newYear !== invoice.year) {
      const duplicate = await M(StudentFeeInvoice).exists({
        _id: { $ne: invoice._id },
        studentId: invoice.studentId,
        feeCategoryId: invoice.feeCategoryId,
        month: newMonth,
        year: newYear,
      });
      if (duplicate) return bad("An invoice for this category and month already exists", 409);
    }

    // Date (checked before saving anything; past or future allowed)
    const newDay = toPkDay(date);
    if (date && !newDay) return bad("Invalid date");

    // Update
    invoice.month = newMonth;
    invoice.year = newYear;
    if (title && String(title).trim()) invoice.title = String(title).trim();
    if (description !== undefined) invoice.description = String(description ?? "").trim();

    invoice.discount = d;
    invoice.netPayable = newNet;
    invoice.remainingAmount = newNet - invoice.paidAmount;
    invoice.status =
      invoice.remainingAmount <= 0 ? "paid" : invoice.paidAmount > 0 ? "partial" : "pending";

    await invoice.save();

    // Date: only the day changes — the original time of day is kept
    let newDateStr = before.date;
    if (newDay && newDay !== before.date) {
      const old = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
      await M(StudentFeeInvoice).collection.updateOne(
        { _id: invoice._id },
        { $set: { createdAt: onPkDay(newDay, old) } },
      );
      newDateStr = newDay;
    }

    // What changed (for the log)
    const changes: { field: string; from: string; to: string }[] = [];
    const add = (field: string, from: any, to: any) => {
      if (String(from) !== String(to)) changes.push({ field, from: String(from), to: String(to) });
    };
    add("Title", before.title, invoice.title || "");
    add("Month", period(before.month, before.year), period(invoice.month, invoice.year));
    add("Discount", before.discount, d);
    add("Description", before.description, invoice.description || "");
    add("Date", before.date, newDateStr);

    if (changes.length) {
      const student: any = await M(Student).findById(invoice.studentId).select("fullName grNumber").lean();
      logActivity(access, req, {
        action: "update",
        module: "invoices",
        schoolId,
        entityId: String(invoice._id),
        entityLabel: `${student?.fullName || "Student"} (GR ${student?.grNumber ?? "-"})`,
        summary: `Updated invoice "${invoice.title || `${invoice.categoryName} ${period(invoice.month, invoice.year)}`}"`,
        changes,
      });
    }

    const updated = await M(StudentFeeInvoice).findById(invoice._id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Invoices PATCH error:", error?.message);
    return bad("Failed to update invoice", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE — { id }
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return unauthorized();
    if (!access.can("invoices", "delete")) return denied("delete invoices");

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!id || !isOid(id)) return bad("Invoice ID is required");

    const invoice: any = await M(StudentFeeInvoice).findById(id);
    if (!invoice) return bad("Invoice not found", 404);

    const schoolId = schoolIdFor(access, String(invoice.schoolId));
    if (!schoolId || String(invoice.schoolId) !== schoolId) return bad("Invoice not found", 404);

    // Payments would be lost with the invoice
    if ((invoice.paidAmount || 0) > 0 || (invoice.paymentHistory?.length || 0) > 0) {
      return bad("This invoice has payments. Reverse the payments first.");
    }

    await M(StudentFeeInvoice).deleteOne({ _id: invoice._id });

    const student: any = await M(Student).findById(invoice.studentId).select("fullName grNumber").lean();
    logActivity(access, req, {
      action: "delete",
      module: "invoices",
      schoolId,
      entityId: String(invoice._id),
      entityLabel: `${student?.fullName || "Student"} (GR ${student?.grNumber ?? "-"})`,
      summary: `Deleted invoice "${invoice.title || `${invoice.categoryName} ${period(invoice.month, invoice.year)}`}" — Rs. ${(invoice.netPayable || 0).toLocaleString("en-US")}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Invoices DELETE error:", error?.message);
    return bad("Failed to delete invoice", 500);
  }
}