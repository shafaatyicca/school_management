import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requirePermission, schoolIdFor, logActivity } from "@/lib/access";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { nextSequence, formatReceiptNo } from "@/lib/counter";
import { toYMD } from "@/lib/pkTime";

const M = (model: any) => model as any; // avoids Mongoose union-type errors
const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

const METHODS = ["cash", "bank", "online"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const period = (m: number, y: number) => `${MONTHS[m - 1] || m} ${y}`;

// PATCH — { invoiceId, amount, method, note, date }
export async function PATCH(req: Request) {
  try {
    const { access, error } = await requirePermission("takePayment", "create");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const { invoiceId, amount, method, note, date } = body || {};
    const payAmount = Number(amount);

    if (!invoiceId || !isOid(invoiceId)) return bad("Invoice is required");
    if (!payAmount || isNaN(payAmount) || payAmount <= 0) return bad("Enter a valid amount");

    const invoice: any = await M(StudentFeeInvoice).findById(invoiceId);
    if (!invoice) return bad("Invoice not found", 404);

    // Must be this user's school (Super Admin: any school)
    const schoolId = schoolIdFor(access!, String(invoice.schoolId));
    if (!schoolId || String(invoice.schoolId) !== schoolId) return bad("Invoice not found", 404);

    if (invoice.status === "paid" || invoice.remainingAmount <= 0) {
      return bad("This invoice is already fully paid");
    }

    // Overpayment check
    if (payAmount > invoice.remainingAmount) {
      return bad(`Maximum payable amount is Rs. ${Number(invoice.remainingAmount).toLocaleString("en-US")}`);
    }

        // Payment date (Pakistan day): today → now, old date → that day, future → not allowed
    let paidDate = new Date();
    if (date) {
      const raw = String(date);
      const day = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw
        : isNaN(new Date(raw).getTime())
          ? ""
          : toYMD(new Date(raw));
      if (!day || isNaN(Date.parse(`${day}T00:00:00+05:00`))) return bad("Invalid payment date");

      const today = toYMD();
      if (day > today) return bad("Payment date cannot be in the future");

      if (day < today) {
        // Old date → that day, at the current time of day
        const DAY = 24 * 60 * 60 * 1000;
        const timeOfDay = (Date.now() + 5 * 60 * 60 * 1000) % DAY;
        paidDate = new Date(Date.parse(`${day}T00:00:00+05:00`) + timeOfDay);
      }
    }
    const payMethod = METHODS.includes(String(method)) ? String(method) : "cash";

    // School's next receipt number (GlobalCounter: "payment_<schoolId>")
    const seq = await nextSequence(invoice.schoolId, "payment");
    const paymentNo = formatReceiptNo(seq);

    // Add the payment
    invoice.paymentHistory.push({
      paymentNo,
      amount: payAmount,
      paidDate,
      method: payMethod,
      note: note ? String(note).trim() : "",
      receivedBy: access!.userId || null,
    });

    // New payment (Mongoose created its _id)
    const newPayment = invoice.paymentHistory[invoice.paymentHistory.length - 1];

    // Amounts
    invoice.paidAmount = (invoice.paidAmount || 0) + payAmount;
    invoice.remainingAmount = invoice.netPayable - invoice.paidAmount;

    // Status
    if (invoice.remainingAmount <= 0) {
      invoice.status = "paid";
      invoice.remainingAmount = 0;
    } else {
      invoice.status = "partial";
    }

    // If someone else changed this invoice at the same moment, save fails (no double payment)
    invoice.increment();
    try {
      await invoice.save();
    } catch (e: any) {
      if (e?.name === "VersionError") {
        return bad("This invoice was just updated. Please refresh and try again.", 409);
      }
      throw e;
    }

    // Activity log (also shows in the staff dashboard's My Activity)
    const student: any = await M(Student).findById(invoice.studentId).select("fullName grNumber").lean();
    const methodLabel = payMethod.charAt(0).toUpperCase() + payMethod.slice(1);
    logActivity(access!, req, {
      action: "payment",
      module: "payments",
      schoolId,
      entityId: String(invoice._id),
      entityLabel: `${student?.fullName || "Student"} (GR ${student?.grNumber ?? "-"})`,
      summary: `Received Rs. ${payAmount.toLocaleString("en-US")} (${methodLabel}) — ${paymentNo} · ${
        invoice.title || `${invoice.categoryName} ${period(invoice.month, invoice.year)}`
      }`,
      changes: [
        { field: "Receipt No", from: "", to: paymentNo },
        { field: "Amount", from: "", to: payAmount },
        { field: "Method", from: "", to: methodLabel },
        { field: "Invoice", from: "", to: invoice.title || `${invoice.categoryName} ${period(invoice.month, invoice.year)}` },
        { field: "Remaining", from: "", to: invoice.remainingAmount },
        { field: "Status", from: "", to: invoice.status },
      ],
    });

    const updatedInvoice = await M(StudentFeeInvoice)
      .findById(invoice._id)
      .populate("paymentHistory.receivedBy", "name fullName");

    return NextResponse.json({
      invoice: updatedInvoice,
      payment: {
        paymentId: String(newPayment._id), // database ID
        paymentNo, // receipt number
        amount: payAmount,
      },
    });
  } catch (error: any) {
    console.error("Take payment error:", error?.message);
    return bad("Failed to save payment", 500);
  }
}