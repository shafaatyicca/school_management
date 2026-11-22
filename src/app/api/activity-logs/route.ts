import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ActivityLogModel } from "@/models/ActivityLog";
import { getAccess, schoolIdFor, logActivity } from "@/lib/access";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan = UTC+5 (no daylight saving)
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11-17" (Pakistan date) → that day's start in UTC
function pkDayStart(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - PKT_OFFSET_MS);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// GET → logs of one school
//   School Admin / Super Admin: everyone's logs (or only their own with ?mine=1)
//   Everyone else: ONLY their own logs (forced here, whatever the URL says)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const sp = new URL(req.url).searchParams;
    const isAdmin = access.isSuperAdmin || access.isSchoolAdmin;
    const mine = !isAdmin || sp.get("mine") === "1";

    const schoolId = schoolIdFor(access, sp.get("schoolId"));
    if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });

    // ── Filters (everything except the user chip)
    const base: any = { schoolId };
    if (mine) {
      base.userId = access.userId;
      // Super Admin's own logs may have no school
      if (access.isSuperAdmin) base.schoolId = { $in: [schoolId, null] };
    } else if (!access.isSuperAdmin) {
      base.userRole = { $ne: "super_admin" }; // Super Admin stays hidden from School Admin
    }

    const from = sp.get("from");
    const to = sp.get("to");
    if ((from && YMD.test(from)) || (to && YMD.test(to))) {
      base.createdAt = {};
      if (from && YMD.test(from)) base.createdAt.$gte = pkDayStart(from);
      if (to && YMD.test(to)) base.createdAt.$lt = new Date(pkDayStart(to).getTime() + DAY_MS);
    }
    const action = sp.get("action");
    if (action) base.action = String(action);
    const q = (sp.get("q") || "").trim().slice(0, 100);
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      base.$or = [{ summary: rx }, { entityLabel: rx }, { userName: rx }, { module: rx }];
    }

    // ── User chip filter (admins only)
    const filter: any = { ...base };
    const userId = sp.get("userId");
    if (!mine && userId) filter.userId = userId;

    const limit = Math.min(100, Math.max(10, Number(sp.get("limit")) || 50));
    const page = Math.max(1, Number(sp.get("page")) || 1);

    const [logs, total, users, months] = await Promise.all([
      (ActivityLogModel as any)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      (ActivityLogModel as any).countDocuments(filter),
      // Users for the chips (admins only)
      mine
        ? Promise.resolve([])
        : (ActivityLogModel as any).aggregate([
            { $match: base },
            {
              $group: {
                _id: "$userId",
                userName: { $last: "$userName" },
                userRole: { $last: "$userRole" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ]),
      // Months available for delete (Super Admin, full view only)
      access.isSuperAdmin && !mine
        ? (ActivityLogModel as any).aggregate([
            { $match: { schoolId } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Karachi" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
          ])
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      users: users
        .filter((u: any) => u._id)
        .map((u: any) => ({ userId: u._id, userName: u.userName, userRole: u.userRole, count: u.count })),
      months: months.map((m: any) => ({ month: m._id, count: m.count })),
      canDelete: access.isSuperAdmin && !mine,
      mine,
    });
  } catch (error: any) {
    console.error("Activity logs GET error:", error?.message);
    return NextResponse.json({ message: "Failed to load logs" }, { status: 500 });
  }
}

// DELETE → { schoolId, month: "YYYY-MM" } → all logs of that month (Super Admin only)
export async function DELETE(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.isSuperAdmin)
      return NextResponse.json({ message: "Only Super Admin can delete logs" }, { status: 403 });

    await connectDB();
    const body = await req.json().catch(() => null);
    const schoolId = body?.schoolId;
    const month = body?.month;
    if (!schoolId || !/^\d{4}-\d{2}$/.test(month || ""))
      return NextResponse.json({ message: "School and month (YYYY-MM) are required" }, { status: 400 });

    const [y, m] = month.split("-").map(Number);
    const start = pkDayStart(`${month}-01`);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = pkDayStart(next);

    const result = await (ActivityLogModel as any).deleteMany({
      schoolId,
      createdAt: { $gte: start, $lt: end },
    });

    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    // The deletion itself is recorded
    logActivity(access, req, {
      action: "delete",
      module: "logs",
      schoolId,
      summary: `Deleted ${result.deletedCount || 0} activity logs of ${label}`,
    });

    return NextResponse.json({ deleted: result.deletedCount || 0 });
  } catch (error: any) {
    console.error("Activity logs DELETE error:", error?.message);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}