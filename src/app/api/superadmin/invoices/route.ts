import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { SchoolInvoiceModel } from "@/models/SchoolInvoice";
import { SchoolModel } from "@/models/School";
import { GlobalCounterModel } from "@/models/GlobalCounter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { toYMD } from "@/lib/pkTime";

const Invoice = SchoolInvoiceModel as any; // avoids Mongoose union-type errors
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Super Admin only (create / pay / edit / delete)
async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === "super_admin";
}
const forbidden = () =>
  NextResponse.json({ error: "Only Super Admin", message: "Only Super Admin" }, { status: 403 });
const bad = (error: string, status = 400) => NextResponse.json({ error, message: error }, { status });

// A bill with any payment is a money record → never deleted
const HAS_PAYMENTS = { $or: [{ amountPaid: { $gt: 0 } }, { "paymentHistory.0": { $exists: true } }] };

// Payment date: today → now; another day → that day at noon (Pakistan)
function paymentDateOf(input: any): Date | null {
  if (!input) return new Date();
  const s = String(input);
  if (YMD.test(s)) {
    if (s === toYMD()) return new Date();
    const d = new Date(`${s}T12:00:00+05:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// 1. GET INVOICES
// Super Admin: all (or ?schoolId). A school user (School Admin dashboard warning): only own school.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user: any = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    let schoolId = searchParams.get("schoolId");
    if (user.role !== "super_admin") {
      if (!user.schoolId) return forbidden();
      schoolId = String(user.schoolId);
    }
    let query = schoolId ? { schoolId } : {};

    const invoices = await Invoice.find(query)
      .populate("schoolId", "name address phone")
      .sort({ createdAt: -1 });
    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE INVOICE (Single OR Bulk) — unchanged
export async function POST(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const body = await req.json();
    const { type, billingMonth, dueDate } = body;

    // --- BULK GENERATE LOGIC ---
    if (type === "bulk") {
      const schools = await (SchoolModel as any).find({ status: "active" }).populate("planId");
      let count = 0;
      let skipped = 0;

      for (const school of schools) {
        const existing = await Invoice.findOne({
          schoolId: school._id,
          billingMonth,
        });
        if (existing) {
          skipped++;
          continue;
        }

        const planFee =
          Number(school.customPrice) || Number((school.planId as any)?.price) || 0;

        const lastInv = await Invoice.findOne({ schoolId: school._id }).sort({ createdAt: -1 });
        const lastInvMonth2 = Number(lastInv?.feedingSplit?.month2) || 0;
        const alreadyCarriedForward =
          lastInvMonth2 > 0
            ? await Invoice.findOne({
                schoolId: school._id,
                "feedingSplit.month1": { $gt: 0 },
                createdAt: { $gt: lastInv.createdAt },
              })
            : true;

        const feedingArrears = !alreadyCarriedForward ? lastInvMonth2 : 0;
        const totalAmount = planFee + feedingArrears;
        const counter = await (GlobalCounterModel as any).findOneAndUpdate(
          { id: "school_invoice" },
          { $inc: { seq: 1 } },
          { new: true, upsert: true },
        );
        const invoiceNumber = `INV-${counter.seq.toString().padStart(3, "0")}`;

        await Invoice.create({
          invoiceNumber,
          schoolId: school._id,
          planAmount: planFee,
          feedingSplit: { month1: feedingArrears, month2: 0 },
          finalAmount: totalAmount,
          amountPaid: 0,
          remainingAmount: totalAmount,
          billingMonth,
          dueDate: new Date(dueDate),
          status: "pending",
        });

        await (SchoolModel as any).findByIdAndUpdate(school._id, {
          expiryDate: new Date(dueDate),
        });
        count++;
      }
      return NextResponse.json({
        success: true,
        message: `${count} Invoices Created!${skipped > 0 ? ` (${skipped} already existed)` : ""}`,
        skipped,
      });
    }

    // --- SINGLE GENERATE LOGIC ---
    const { schoolId, planAmount, feedingSplit, discount } = body;

    // Duplicate check
    const existingInvoice = await Invoice.findOne({ schoolId, billingMonth });
    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice for ${billingMonth} already exists!` },
        { status: 409 },
      );
    }

    const counter = await (GlobalCounterModel as any).findOneAndUpdate(
      { id: "school_invoice" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const invoiceNumber = `INV-${counter.seq.toString().padStart(3, "0")}`;

    const finalAmount =
      Number(planAmount || 0) + Number(feedingSplit?.month1 || 0) - Number(discount || 0);

    const newInvoice = await Invoice.create({
      invoiceNumber,
      schoolId,
      planAmount: Number(planAmount),
      feedingSplit,
      discount: Number(discount || 0),
      finalAmount,
      amountPaid: 0,
      remainingAmount: finalAmount,
      billingMonth,
      dueDate: new Date(dueDate),
      status: "pending",
    });
    await (SchoolModel as any).findByIdAndUpdate(schoolId, {
      expiryDate: new Date(dueDate),
    });
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE / PAY / EDIT
export async function PUT(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const body = await req.json();
    const { invoiceId, action, amountToPay, updatedData, paymentDate } = body;

    if (!invoiceId || !mongoose.isValidObjectId(invoiceId)) return bad("Invoice not found", 404);
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return bad("Not found", 404);

    // ── PAY (one payment = one receipt number)
    if (action === "pay") {
      const payAmount = Number(amountToPay || 0);
      if (!payAmount || isNaN(payAmount) || payAmount <= 0) return bad("Enter a valid amount");
      if (invoice.status === "cancelled") return bad("This invoice is cancelled");

      const remaining = Number(invoice.remainingAmount ?? 0);
      if (remaining <= 0) return bad("This invoice is already fully paid");
      if (payAmount > remaining) {
        return bad(`Maximum payable amount is Rs ${remaining.toLocaleString("en-US")}`);
      }

      const payDate = paymentDateOf(paymentDate);
      if (!payDate) return bad("Invalid payment date");

      // Receipt number (separate from invoice numbers)
      const counter = await (GlobalCounterModel as any).findOneAndUpdate(
        { id: "school_payment" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      const paymentNo = `PAY-${String(counter.seq).padStart(4, "0")}`;

      // Check + save in ONE step → a double click can't pay twice / overpay
      const updated = await Invoice.findOneAndUpdate(
        { _id: invoiceId, status: { $ne: "cancelled" }, remainingAmount: { $gte: payAmount } },
        {
          $inc: { amountPaid: payAmount, remainingAmount: -payAmount },
          $set: { paidAt: payDate },
          $push: { paymentHistory: { paymentNo, amount: payAmount, date: payDate } },
        },
        { new: true },
      );
      if (!updated) {
        return bad("This invoice was just updated. Please refresh and try again.", 409);
      }

      const left = Math.max(0, Number(updated.remainingAmount || 0));
      const newStatus = left <= 0 ? "paid" : "partially_paid";
      await Invoice.updateOne({ _id: invoiceId }, { $set: { status: newStatus, remainingAmount: left } });
      updated.status = newStatus;
      updated.remainingAmount = left;

      return NextResponse.json(updated);
    }

    // ── EDIT (only bill fields; payments are never edited here)
    if (action === "edit") {
      const EDITABLE = ["planAmount", "discount", "feedingSplit", "totalFeedingAmount", "billingMonth", "dueDate"];
      const clean: any = {};
      for (const k of EDITABLE) {
        if (updatedData?.[k] !== undefined) clean[k] = updatedData[k];
      }
      if (clean.planAmount !== undefined) clean.planAmount = Number(clean.planAmount || 0);
      if (clean.discount !== undefined) clean.discount = Number(clean.discount || 0);
      if (clean.dueDate !== undefined) {
        const d = new Date(clean.dueDate);
        if (isNaN(d.getTime())) return bad("Invalid due date");
        clean.dueDate = d;
      }

      const plan = Number(clean.planAmount ?? invoice.planAmount ?? 0);
      const feeding = Number((clean.feedingSplit ?? invoice.feedingSplit)?.month1 || 0);
      const disc = Number(clean.discount ?? invoice.discount ?? 0);
      const finalAmount = plan + feeding - disc;
      const paid = Number(invoice.amountPaid || 0);

      if (finalAmount < 0) return bad("Discount can't be more than the bill");
      if (finalAmount < paid) {
        return bad(`Rs ${paid.toLocaleString("en-US")} has already been paid on this invoice`);
      }

      const remainingAmount = Math.max(0, finalAmount - paid);
      const status =
        invoice.status === "cancelled"
          ? "cancelled"
          : remainingAmount <= 0
            ? "paid"
            : paid > 0
              ? "partially_paid"
              : "pending";

      const edited = await Invoice.findByIdAndUpdate(
        invoiceId,
        { $set: { ...clean, finalAmount, remainingAmount, status } },
        { new: true },
      );
      if (clean.dueDate) {
        await (SchoolModel as any).findByIdAndUpdate(invoice.schoolId, {
          expiryDate: clean.dueDate,
        });
      }
      return NextResponse.json(edited);
    }

    return bad("Unknown action");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE (Single & Bulk) — bills with payments are kept
export async function DELETE(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    if (ids) {
      const list = ids.split(",").filter((x) => mongoose.isValidObjectId(x));
      const blocked: any[] = await Invoice.find({ _id: { $in: list }, ...HAS_PAYMENTS })
        .select("invoiceNumber")
        .lean();
      const blockedIds = new Set(blocked.map((b) => String(b._id)));
      const toDelete = list.filter((x) => !blockedIds.has(x));
      const r = toDelete.length ? await Invoice.deleteMany({ _id: { $in: toDelete } }) : { deletedCount: 0 };

      const message = blocked.length
        ? `${r.deletedCount} deleted. ${blocked.length} skipped because they have payments (${blocked
            .map((b) => b.invoiceNumber)
            .join(", ")}).`
        : "Selected invoices deleted";
      return NextResponse.json({
        message,
        deleted: r.deletedCount,
        skipped: blocked.map((b) => b.invoiceNumber),
      });
    }

    if (id) {
      if (!mongoose.isValidObjectId(id)) return bad("Invoice not found", 404);
      const invoice: any = await Invoice.findById(id).lean();
      if (!invoice) return bad("Invoice not found", 404);

      if (Number(invoice.amountPaid || 0) > 0 || (invoice.paymentHistory || []).length > 0) {
        return bad(
          `${invoice.invoiceNumber} has payments (Rs ${Number(invoice.amountPaid || 0).toLocaleString("en-US")} received), so it can't be deleted.`,
          409,
        );
      }

      await Invoice.findByIdAndDelete(id);
      return NextResponse.json({ message: "Invoice deleted" });
    }

    return bad("Missing ID");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}