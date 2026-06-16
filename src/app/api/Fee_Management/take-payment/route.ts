import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
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

    if (!invoiceId || !amount || amount <= 0) {
      return NextResponse.json(
        { message: "invoiceId aur valid amount required" },
        { status: 400 }
      );
    }

    const invoice = await StudentFeeInvoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { message: "Invoice already fully paid" },
        { status: 400 }
      );
    }

    // Overpayment check
    if (amount > invoice.remainingAmount) {
      return NextResponse.json(
        { message: `Maximum payable amount is ${invoice.remainingAmount}` },
        { status: 400 }
      );
    }

    // Payment record add karo
    invoice.paymentHistory.push({
      amount,
      paidDate: date ? new Date(date) : new Date(),
      method: method || "cash",
      note: note || "",
      receivedBy: (session.user as any).id || null,
    });

    // Amounts update
    invoice.paidAmount      += amount;
    invoice.remainingAmount = invoice.netPayable - invoice.paidAmount;          

    // Status update
    if (invoice.remainingAmount <= 0) {
      invoice.status = "paid";
      invoice.remainingAmount = 0;
    } else {
      invoice.status = "partial";
    }

    await invoice.save();
    const updatedInvoice = await StudentFeeInvoice.findById(invoice._id)
   .populate("paymentHistory.receivedBy", "fullName");
    return NextResponse.json(updatedInvoice);

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}