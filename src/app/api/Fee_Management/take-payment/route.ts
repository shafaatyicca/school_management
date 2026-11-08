import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { nextSequence, formatReceiptNo } from "@/lib/counter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId, amount, method, note, date } = await req.json();
    const payAmount = Number(amount);

    if (!invoiceId || !payAmount || payAmount <= 0) {
      return NextResponse.json(
        { message: "invoiceId aur valid amount required" },
        { status: 400 },
      );
    }

    const invoice: any = await (StudentFeeInvoice as any).findById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { message: "Invoice already fully paid" },
        { status: 400 },
      );
    }

    // Overpayment check
    if (payAmount > invoice.remainingAmount) {
      return NextResponse.json(
        { message: `Maximum payable amount is ${invoice.remainingAmount}` },
        { status: 400 },
      );
    }

    // ✅ School ka agla receipt number (GlobalCounter: "payment_<schoolId>")
    const seq = await nextSequence(invoice.schoolId, "payment");
    const paymentNo = formatReceiptNo(seq);

    // Payment record add karo
    invoice.paymentHistory.push({
      paymentNo,
      amount: payAmount,
      paidDate: date ? new Date(date) : new Date(),
      method: method || "cash",
      note: note || "",
      receivedBy: (session.user as any).id || null,
    });

    // Naya payment (Mongoose ne is ka _id khud bana diya)
    const newPayment =
      invoice.paymentHistory[invoice.paymentHistory.length - 1];

    // Amounts update
    invoice.paidAmount += payAmount;
    invoice.remainingAmount = invoice.netPayable - invoice.paidAmount;

    // Status update
    if (invoice.remainingAmount <= 0) {
      invoice.status = "paid";
      invoice.remainingAmount = 0;
    } else {
      invoice.status = "partial";
    }

    await invoice.save();

    const updatedInvoice = await (StudentFeeInvoice as any).findById(invoice._id)
      .populate("paymentHistory.receivedBy", "fullName");

    return NextResponse.json({
      invoice: updatedInvoice,
      payment: {
        paymentId: String(newPayment._id), // database ID
        paymentNo,                         // receipt number (RCPT-0001)
        amount: payAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}