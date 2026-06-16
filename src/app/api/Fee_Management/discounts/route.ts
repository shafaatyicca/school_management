import { FeeDiscount } from "@/models/FeeDiscount";
import { connectDB } from "@/lib/db";
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
  const discounts = await FeeDiscount.find({ studentId, ...(schoolId && { schoolId }) } as any).populate(
    "feeCategoryId",
    "name",
  );
  return NextResponse.json(discounts);
}

// 2. CREATE (POST)
export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const newDiscount = await FeeDiscount.create(body);
  return NextResponse.json(newDiscount, { status: 201 });
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
  await FeeDiscount.deleteOne({ _id: id } as any);
  return NextResponse.json({ success: true });
}
