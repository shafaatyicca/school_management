import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { ensureTuitionLock } from "@/lib/feeLock";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { applyLateFines } from "@/lib/lateFine";

// ── GET — Student ki invoices fetch karo
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = searchParams.get("schoolId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (studentId) await applyLateFines(studentId);
    const filter: any = { schoolId };
    if (studentId) filter.studentId = studentId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const invoices = await StudentFeeInvoice.find(filter)
      .populate("paymentHistory.receivedBy", "name")
      .sort({ year: -1, month: -1 });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ── POST — Invoice generate karo
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const {
      studentId,
      month,
      year,
      schoolId,
      feeCategoryId,
      title,
      amount,
      description,
    } = await req.json();

    if (!studentId || !month || !year || !schoolId || !feeCategoryId) {
      return NextResponse.json(
        { message: "All fields required" },
        { status: 400 },
      );
    }

    // 1. Duplicate check
    const existing = await StudentFeeInvoice.findOne({
      studentId,
      month,
      year,
      feeCategoryId,
    });
    if (existing) {
      return NextResponse.json(
        { message: "Invoice already created for this category/month" },
        { status: 409 },
      );
    }

    // 2. Data Fetching
    const student = await Student.findById(studentId).populate("classId");
    const category: any = await FeeCategoryModel.findById(feeCategoryId);

    if (!student || !category) {
      return NextResponse.json(
        { message: "Student or Category not found" },
        { status: 404 },
      );
    }

    const isClassFee = category.feeSource === "class_fee";

    // 3. Tuition ho to pehle lock ensure karo (agar ledger kabhi nahi khula)
    if (isClassFee) {
      await ensureTuitionLock(studentId);
    }

    const discount: any = await FeeDiscount.findOne({
      studentId,
      feeCategoryId,
    } as any);

    // 4. Amount logic
    let baseFee: number;
    let netPayable: number;

    if (discount) {
      // Record hai (locked fee ya discount) → usi se invoice banega
      baseFee = discount.baseFee || 0;
      netPayable = discount.customNetFee ?? baseFee;
    } else {
      // Record nahi → tuition ho to class fee, warna diya gaya amount / category fee
      baseFee = isClassFee
        ? (student.classId as any)?.classFee || 0
        : amount && amount > 0
          ? Number(amount)
          : category.maxBaseFee || 0;
      netPayable = baseFee;
    }

    const discountAmount = Math.max(0, baseFee - netPayable);

    // 5. Create Invoice
    const invoice = await StudentFeeInvoice.create({
      studentId,
      schoolId,
      feeCategoryId,
      categoryName: category.name,
      month: Number(month),
      year: Number(year),
      title,
      description: description ? String(description).trim() : "",
      baseFee,
      discount: discountAmount,
      netPayable,
      paidAmount: 0,
      remainingAmount: netPayable,
      status: "pending",
      paymentHistory: [],
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ── PATCH — Invoice edit: title, date, month, year, description + sirf is invoice ka discount
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { invoiceId, discount, title, date, month, year, description } =
      await req.json();
    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID required" },
        { status: 400 },
      );
    }

    const invoice: any = await StudentFeeInvoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 },
      );
    }

    // ── Discount
    const d = Number(discount);
    if (isNaN(d) || d < 0 || d > invoice.baseFee) {
      return NextResponse.json(
        { message: `Discount 0 se ${invoice.baseFee} ke beech hona chahiye` },
        { status: 400 },
      );
    }

    const newNet = invoice.baseFee - d;
    if (newNet < invoice.paidAmount) {
      return NextResponse.json(
        {
          message: `Is invoice par ${invoice.paidAmount} pehle hi pay ho chuka hai`,
        },
        { status: 400 },
      );
    }

    // ── Month / Year (badle to duplicate check)
    const newMonth = month ? Number(month) : invoice.month;
    const newYear = year ? Number(year) : invoice.year;

    if (newMonth !== invoice.month || newYear !== invoice.year) {
      const duplicate = await StudentFeeInvoice.findOne({
        _id: { $ne: invoice._id },
        studentId: invoice.studentId,
        feeCategoryId: invoice.feeCategoryId,
        month: newMonth,
        year: newYear,
      } as any);
      if (duplicate) {
        return NextResponse.json(
          { message: "Is month/year ki invoice is category mein pehle se hai" },
          { status: 409 },
        );
      }
    }

    // ── Update
    invoice.month = newMonth;
    invoice.year = newYear;
    if (title && String(title).trim()) invoice.title = String(title).trim();
    if (description !== undefined)
      invoice.description = String(description).trim();

    invoice.discount = d;
    invoice.netPayable = newNet;
    invoice.remainingAmount = newNet - invoice.paidAmount;
    invoice.status =
      invoice.remainingAmount <= 0
        ? "paid"
        : invoice.paidAmount > 0
          ? "partial"
          : "pending";

    await invoice.save();

    // ── Date: table "createdAt" dikhati hai, us ko update karo
    // (mongoose createdAt ko lock rakhta hai, is liye seedha collection se)
    if (date) {
      const newDate = new Date(date);
      if (!isNaN(newDate.getTime())) {
        await StudentFeeInvoice.collection.updateOne(
          { _id: invoice._id },
          { $set: { createdAt: newDate } },
        );
      }
    }

    const updated = await (StudentFeeInvoice as any).findById(invoice._id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ── DELETE — Invoice delete karo
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "ID required" }, { status: 400 });
    }
    await (StudentFeeInvoice as any).findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}