import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import "@/models/User"; // receivedBy populate ke liye
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ── GET → student ki payments (har payment alag row), from–to dates ke beech
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const fromParam = searchParams.get("from"); // YYYY-MM-DD
    const toParam = searchParams.get("to");     // YYYY-MM-DD
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin
      ? searchParams.get("schoolId")
      : session.user.schoolId;

    if (!studentId || !schoolId) {
      return NextResponse.json({ payments: [] });
    }

    // Dates na hon to default pichle 5 months
    let from: Date;
    let to: Date;
    if (fromParam && toParam) {
      from = new Date(`${fromParam}T00:00:00.000Z`);
      to = new Date(`${toParam}T23:59:59.999Z`);
    } else {
      to = new Date();
      from = new Date();
      from.setMonth(from.getMonth() - 5);
      from.setHours(0, 0, 0, 0);
    }

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { message: "Invalid date range" },
        { status: 400 },
      );
    }

    const invoices: any[] = await StudentFeeInvoice.find({
      studentId,
      schoolId,
      "paymentHistory.paidDate": { $gte: from, $lte: to },
    } as any)
      .populate("paymentHistory.receivedBy", "name fullName")
      .lean();

    // Har payment ko alag row banao (sirf range ke andar wali)
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

    // Nayi payment upar
    payments.sort(
      (a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime(),
    );

    return NextResponse.json({ from, to, payments });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ── DELETE → sirf EK payment reverse karo (invoice khud recalculate hogi)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId, paymentId } = await req.json();
    if (!invoiceId || !paymentId) {
      return NextResponse.json(
        { message: "invoiceId aur paymentId required" },
        { status: 400 },
      );
    }

    const isSuperAdmin = session.user.role === "super_admin";
    const filter: any = { _id: invoiceId };
    if (!isSuperAdmin) filter.schoolId = session.user.schoolId;

    const invoice: any = await StudentFeeInvoice.findOne(filter);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    const payment = invoice.paymentHistory.id(paymentId);
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    // 1. Audit record (reverse hui payment mitai nahi jati)
    const { _id, ...paymentData } = payment.toObject();
    invoice.reversedPayments.push({
      ...paymentData,
      originalPaymentId: _id,
      reversedBy: (session.user as any).id || null,
      reversedAt: new Date(),
    });

    // 2. Sirf yehi payment hatao
    invoice.paymentHistory.pull({ _id: paymentId });

    // 3. Invoice dobara calculate karo
    invoice.paidAmount = invoice.paymentHistory.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    );
    invoice.remainingAmount = Math.max(
      0,
      invoice.netPayable - invoice.paidAmount,
    );
    invoice.status =
      invoice.paidAmount <= 0
        ? "pending"
        : invoice.remainingAmount <= 0
          ? "paid"
          : "partial";

    await invoice.save();

    return NextResponse.json({
      success: true,
      paymentNo: paymentData.paymentNo || "",
      invoiceStatus: invoice.status,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}