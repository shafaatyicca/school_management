import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";

// Always fresh (never cached) — ticks can change at any time
export const dynamic = "force-dynamic";

// The logged-in user's own permissions (used to hide pages / buttons)
export async function GET() {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    return NextResponse.json(
      {
        role: access.role,
        isSuperAdmin: access.isSuperAdmin,
        permissions: access.permissions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    console.error("Me/access error:", error?.message);
    return NextResponse.json({ message: "Failed to load permissions" }, { status: 500 });
  }
}