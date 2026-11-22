import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Super Admin only
async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === "super_admin";
}
const forbidden = () =>
  NextResponse.json({ error: "Only Super Admin", message: "Only Super Admin" }, { status: 403 });

// 1. Get all plans
export async function GET() {
  if (!(await isSuperAdmin())) return forbidden();
  await connectDB();
  try {
    const plans = await Plan.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(plans);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// 2. Create a plan
export async function POST(req: Request) {
  if (!(await isSuperAdmin())) return forbidden();
  await connectDB();
  try {
    const body = await req.json();
    const plan = await Plan.create(body);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

// 3. Update a plan
export async function PUT(req: Request) {
  if (!(await isSuperAdmin())) return forbidden();
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

// 4. Delete a plan
export async function DELETE(req: Request) {
  if (!(await isSuperAdmin())) return forbidden();
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