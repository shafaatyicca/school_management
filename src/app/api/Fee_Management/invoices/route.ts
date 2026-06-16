import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ── GET — Student ki invoices fetch karo
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = searchParams.get("schoolId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const filter: any = { schoolId };
    if (studentId) filter.studentId = studentId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const invoices = await StudentFeeInvoice.find(filter)
    .populate("paymentHistory.receivedBy", "name")
    .sort({year: -1, month: -1,
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { studentId, month, year, schoolId, feeCategoryId, title, amount } =
      await req.json();

    if (!studentId || !month || !year || !schoolId || !feeCategoryId) {
      return NextResponse.json(
        { message: "All fields required" },
        { status: 400 },
      );
    }

    // 1. Duplicate check (ab flat field check hogi)
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
    const category = await FeeCategoryModel.findById(feeCategoryId);
    const discount = await FeeDiscount.findOne({
      studentId,
      feeCategoryId,
      schoolId,
    });

    if (!student || !category) {
      return NextResponse.json(
        { message: "Student or Category not found" },
        { status: 404 },
      );
    }

    // 3. Logic: Tuition ho to classFee, warna category ka maxBaseFee
    const isTuition = category.name === "Tuition Fee";
    const defaultBaseFee = isTuition
      ? (student.classId as any)?.classFee || 0
      : category.maxBaseFee;
    const baseFee =
      !isTuition && amount && amount > 0 ? amount : defaultBaseFee;
    // Discount calculation
    const discountAmount = discount ? baseFee - discount.customNetFee : 0;
    const netPayable = discount ? discount.customNetFee : baseFee;

    // 4. Create Invoice (No feeItems array)
    const invoice = await StudentFeeInvoice.create({
      studentId,
      schoolId,
      feeCategoryId,
      categoryName: category.name,
      month: Number(month),
      year: Number(year),
      title,
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

// ── DELETE — Invoice delete karo
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ message: "ID required" }, { status: 400 });
    }
    await StudentFeeInvoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
