import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import "@/models/User"; // for receivedBy populate
import { getAccess, requirePermission, schoolIdFor, logActivity } from "@/lib/access";
import { pkToday, pkMidnight } from "@/lib/pkTime";

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const period = (m: number, y: number) => `${MONTHS[m - 1] || m} ${y}`;

// ── GET → student's payments (one row per payment) between from–to (Pakistan dates)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return bad("Unauthorized", 401);
    if (!access.can("fees", "view") && !access.can("reversePayment", "delete")) {
      return bad("You don't have permission to view payments", 403);
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const fromParam = searchParams.get("from"); // YYYY-MM-DD
    const toParam = searchParams.get("to"); // YYYY-MM-DD
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));

    if (!isOid(studentId) || !schoolId) return NextResponse.json({ payments: [] });

    // Student must belong to this school
    const student = await (Student as any).exists({ _id: studentId, schoolId });
    if (!student) return NextResponse.json({ payments: [] });

    // No dates → last 5 months
    let from: Date;
    let to: Date;
    if (fromParam && toParam) {
      if (!YMD.test(fromParam) || !YMD.test(toParam)) return bad("Invalid date range");
      // Whole days in Pakistan time (UTC+5)
      from = new Date(`${fromParam}T00:00:00.000+05:00`);
      to = new Date(`${toParam}T23:59:59.999+05:00`);
    } else {
      // Last 5 months, from 12:00 AM Pakistan time
      const t = pkToday();
      to = new Date();
      from = pkMidnight(t.y, t.m - 5, t.d);
    }

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return bad("Invalid date range");
    }

    const invoices: any[] = await (StudentFeeInvoice as any)
      .find({
        studentId,
        schoolId,
        "paymentHistory.paidDate": { $gte: from, $lte: to },
      })
      .populate("paymentHistory.receivedBy", "name fullName")
      .lean();

    // One row per payment (only the ones inside the range)
    const payments: any[] = [];
    for (const inv of invoices) {
      for (const p of inv.paymentHistory || []) {
        const paid = new Date(p.paidDate);
        if (paid < from || paid > to) continue;
        payments.push({
          invoiceId: String(inv._id),
          paymentId: String(p._id),
          paymentNo: p.paymentNo || "",
          paidDate: p.paidDate,
          amount: p.amount,
          method: p.method,
          note: p.note || "",
          receivedBy: p.receivedBy?.fullName || p.receivedBy?.name || "",
          invoiceTitle: inv.title,
          categoryName: inv.categoryName,
        });
      }
    }

    // Newest first
    payments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());

    return NextResponse.json({ from, to, payments });
  } catch (error: any) {
    console.error("Student payments GET error:", error?.message);
    return bad("Failed to load payments", 500);
  }
}

// ── DELETE → reverse ONE payment (the invoice recalculates itself)
export async function DELETE(req: Request) {
  try {
    const { access, error } = await requirePermission("reversePayment", "delete");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const { invoiceId, paymentId } = body || {};
    const reason = body?.reason ? String(body.reason).trim().slice(0, 300) : "";
    if (!isOid(invoiceId) || !isOid(paymentId)) return bad("Invoice and payment are required");

    const invoice: any = await (StudentFeeInvoice as any).findById(invoiceId);
    if (!invoice) return bad("Invoice not found", 404);

    // Must be this user's school (Super Admin: any school)
    const schoolId = schoolIdFor(access!, String(invoice.schoolId));
    if (!schoolId || String(invoice.schoolId) !== schoolId) return bad("Invoice not found", 404);

    const payment = invoice.paymentHistory.id(paymentId);
    if (!payment) return bad("Payment not found (it may already be reversed)", 404);

    const oldStatus = invoice.status; // for the log

    // 1. Audit record (a reversed payment is never erased)
    const { _id, ...paymentData } = payment.toObject();
    invoice.reversedPayments.push({
      ...paymentData,
      originalPaymentId: _id,
      reversedBy: access!.userId || null,
      reversedAt: new Date(),
      ...(reason ? { reverseReason: reason } : {}),
    });

    // 2. Remove only this payment
    invoice.paymentHistory.pull({ _id: paymentId });

    // 3. Recalculate the invoice
    invoice.paidAmount = invoice.paymentHistory.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    );
    invoice.remainingAmount = Math.max(0, invoice.netPayable - invoice.paidAmount);
    invoice.status =
      invoice.paidAmount <= 0 ? "pending" : invoice.remainingAmount <= 0 ? "paid" : "partial";

    // If someone else changed this invoice at the same moment, stop (no double reverse)
    invoice.increment();
    try {
      await invoice.save();
    } catch (e: any) {
      if (e?.name === "VersionError") {
        return bad("This invoice was just updated. Please refresh and try again.", 409);
      }
      throw e;
    }


    // Activity log
    const student: any = await (Student as any)
      .findById(invoice.studentId)
      .select("fullName grNumber")
      .lean();
    const method = String(paymentData.method || "cash");
    const methodLabel = method.charAt(0).toUpperCase() + method.slice(1);
    const invoiceName = invoice.title || `${invoice.categoryName} ${period(invoice.month, invoice.year)}`;

    logActivity(access!, req, {
      action: "reverse",
      module: "payments",
      schoolId,
      entityId: String(invoice._id),
      entityLabel: `${student?.fullName || "Student"} (GR ${student?.grNumber ?? "-"})`,
      summary: `Reversed Rs. ${Number(paymentData.amount || 0).toLocaleString("en-US")} (${methodLabel}) — ${
        paymentData.paymentNo || "payment"
      } · ${invoiceName}${reason ? ` · Reason: ${reason}` : ""}`,
      changes: [
        { field: "Paid amount", from: invoice.paidAmount + Number(paymentData.amount || 0), to: invoice.paidAmount },
        { field: "Status", from: oldStatus, to: invoice.status },
      ],
    });

    return NextResponse.json({
      success: true,
      paymentNo: paymentData.paymentNo || "",
      invoiceStatus: invoice.status,
    });
  } catch (error: any) {
    console.error("Reverse payment error:", error?.message);
    return bad("Failed to reverse payment", 500);
  }
}