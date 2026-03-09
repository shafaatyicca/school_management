import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/models/Plan";

// 1. Saare plans get karna
export async function GET() {
  await connectDB();
  try {
    const plans = await Plan.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(plans);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// 2. Naya plan create karna
export async function POST(req: Request) {
  await connectDB();
  try {
    const body = await req.json();
    const plan = await Plan.create(body);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

// 3. Plan Update karna
export async function PUT(req: Request) {
  await connectDB();
  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    const plan = await (Plan as any).findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// 4. Plan delete karna
export async function DELETE(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  try {
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    await (Plan as any).findByIdAndDelete(id);

    return NextResponse.json({ message: "Plan deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
