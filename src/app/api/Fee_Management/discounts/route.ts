import { FeeDiscount } from "@/models/FeeDiscount";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { connectDB } from "@/lib/db";
import { ensureTuitionLock } from "@/lib/feeLock";
import { NextResponse } from "next/server";

// 1. READ (GET)
export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const schoolId = searchParams.get("schoolId");
  if (!studentId || studentId === "undefined") {
    return NextResponse.json([]);
  }

  // Jis student ka tuition record nahi, us ki fee abhi lock ho jayegi
  await ensureTuitionLock(studentId);

  const discounts = await FeeDiscount.find({
    studentId,
    ...(schoolId && { schoolId }),
  } as any).populate("feeCategoryId", "name feeSource");

  return NextResponse.json(discounts);
}

// 2. CREATE (POST) → record ho to update, warna create
export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const { studentId, feeCategoryId, ...rest } = body;

  const discount = await FeeDiscount.findOneAndUpdate(
    { studentId, feeCategoryId } as any,
    { $set: { studentId, feeCategoryId, ...rest } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json(discount, { status: 201 });
}

// 3. EDIT/UPDATE (PUT)
export async function PUT(req: Request) {
  await connectDB();
  const { id, ...updateData } = await req.json();
  if (!id)
    return NextResponse.json({ message: "ID is required" }, { status: 400 });

  const updatedDiscount = await FeeDiscount.findByIdAndUpdate(id, updateData, {
    new: true,
    lean: true,
    includeResultMetadata: true,
  });
  return NextResponse.json(updatedDiscount);
}

// 4. DELETE
export async function DELETE(req: Request) {
  await connectDB();
  const { id } = await req.json();

  const discount: any = await (FeeDiscount as any).findById(id).lean();
  if (!discount) return NextResponse.json({ success: true });

  const category: any = await (FeeCategoryModel as any).findById(
    discount.feeCategoryId,
  ).lean();

  // Tuition ka record delete NAHI hoga, warna lock toot jayega
  // aur agli baar nayi class fee par lock ban jayega.
  // Sirf discount hata kar locked fee par wapas kar do.
  if (category?.feeSource === "class_fee") {
    await FeeDiscount.updateOne({ _id: id } as any, {
      $set: {
        customNetFee: discount.baseFee,
        discountType: "fixed",
        discountValue: 0,
        remarks: "Discount removed",
      },
    });
    return NextResponse.json({ success: true, reset: true });
  }

  await FeeDiscount.deleteOne({ _id: id } as any);
  return NextResponse.json({ success: true });
}