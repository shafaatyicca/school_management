import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor } from "@/lib/access";
import { DashboardLayoutModel } from "@/models/DashboardLayout";
import { sanitizeLayout } from "@/lib/dashboardLayout";

// PUT → { schoolId, items: [{ id, size }] } → saves the caller's own layout
export async function PUT(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json().catch(() => null);
    const schoolId = schoolIdFor(access, body?.schoolId);
    if (!schoolId) return NextResponse.json({ message: "School not found" }, { status: 400 });

    const items = sanitizeLayout(body?.items);
    await (DashboardLayoutModel as any).updateOne(
      { userId: access.userId, schoolId },
      { $set: { items } },
      { upsert: true },
    );

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("Dashboard layout error:", error?.message);
    return NextResponse.json({ message: "Failed to save layout" }, { status: 500 });
  }
}