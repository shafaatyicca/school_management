import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import { SchoolInvoiceModel } from "@/models/SchoolInvoice";
import PlanModel from "@/models/Plan";
import Student from "@/models/Student";
import Employee from "@/models/Employee";
import { UserModel } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pkToday, toYMD } from "@/lib/pkTime";

export const dynamic = "force-dynamic";

const M = (model: any) => model as any; // avoids Mongoose union-type errors
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const EXPIRING_DAYS = 15;
const daysLeft = (d: any) => Math.round((Date.parse(toYMD(d)) - Date.parse(toYMD())) / 86400000);

// GET → everything the Super Admin dashboard needs (one request)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin" }, { status: 403 });
    }
    await connectDB();

    // This month in Pakistan
    const t = pkToday();
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = new Date(`${t.y}-${pad(t.m)}-01T00:00:00+05:00`);
    const nextY = t.m === 12 ? t.y + 1 : t.y;
    const nextM = t.m === 12 ? 1 : t.m + 1;
    const monthEnd = new Date(`${nextY}-${pad(nextM)}-01T00:00:00+05:00`);
    const billingMonth = `${MONTHS[t.m - 1]} ${t.y}`; // "November 2026" (same text the invoice form saves)

    const unpaid = { status: { $in: ["pending", "partially_paid"] }, remainingAmount: { $gt: 0 } };

    const [
      schools,
      plans,
      students,
      employees,
      users,
      studentsBySchool,
      billedAgg,
      collectedAgg,
      pendingAgg,
      recentAgg,
      overdueAgg,
    ]: any[] = await Promise.all([
      M(SchoolModel).find({}).select("name slug status expiryDate planId").lean(),
      M(PlanModel).find({}).select("name").lean(),
      M(Student).countDocuments({ status: "active" }),
      M(Employee).countDocuments({ status: "active" }),
      M(UserModel).countDocuments({ role: { $ne: "super_admin" } }),
      M(Student).aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$schoolId", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      M(SchoolInvoiceModel).aggregate([
        { $match: { billingMonth: { $regex: `^${billingMonth}$`, $options: "i" }, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      M(SchoolInvoiceModel).aggregate([
        { $unwind: "$paymentHistory" },
        { $match: { "paymentHistory.date": { $gte: monthStart, $lt: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$paymentHistory.amount" } } },
      ]),
      M(SchoolInvoiceModel).aggregate([
        { $match: unpaid },
        { $group: { _id: null, total: { $sum: "$remainingAmount" }, count: { $sum: 1 } } },
      ]),
      M(SchoolInvoiceModel).aggregate([
        { $unwind: "$paymentHistory" },
        { $sort: { "paymentHistory.date": -1 } },
        { $limit: 5 },
        {
          $project: {
            schoolId: 1,
            invoiceNumber: 1,
            paymentNo: "$paymentHistory.paymentNo",
            billingMonth: 1,
            amount: "$paymentHistory.amount",
            date: "$paymentHistory.date",
          },
        },
      ]),
      // Unpaid bills whose due date has passed
      M(SchoolInvoiceModel).aggregate([
        { $match: { ...unpaid, dueDate: { $lt: new Date() } } },
        { $group: { _id: "$schoolId", total: { $sum: "$remainingAmount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const schoolById = new Map<string, any>(schools.map((s: any) => [String(s._id), s]));
    const planName = new Map<string, string>(plans.map((p: any) => [String(p._id), p.name]));
    const activeSchools = schools.filter((s: any) => s.status === "active");

    // ── Needs attention: expired / inactive → unpaid overdue → expiring soon
    const attention: any[] = [];
    for (const s of schools) {
      const d = s.expiryDate ? daysLeft(s.expiryDate) : null;
      if (s.status !== "active" || (d !== null && d < 0)) {
        attention.push({ schoolId: String(s._id), name: s.name, kind: "expired", days: d, rank: 0 });
      } else if (d !== null && d <= EXPIRING_DAYS) {
        attention.push({ schoolId: String(s._id), name: s.name, kind: "expiring", days: d, rank: 2 + d / 100 });
      }
    }
    for (const o of overdueAgg) {
      const s = schoolById.get(String(o._id));
      if (!s) continue;
      attention.push({
        schoolId: String(s._id),
        name: s.name,
        kind: "unpaid",
        amount: o.total,
        count: o.count,
        rank: 1,
      });
    }
    attention.sort((a, b) => a.rank - b.rank);

    // ── Schools by plan
    const planCounts = new Map<string, number>();
    for (const s of schools) {
      const name = planName.get(String(s.planId)) || "No plan";
      planCounts.set(name, (planCounts.get(name) || 0) + 1);
    }

    return NextResponse.json({
      billingMonth,
      kpis: {
        schools: {
          total: schools.length,
          active: activeSchools.length,
          inactive: schools.length - activeSchools.length,
        },
        students,
        employees,
        users,
        billed: billedAgg[0]?.total || 0,
        collected: collectedAgg[0]?.total || 0,
        pending: { total: pendingAgg[0]?.total || 0, count: pendingAgg[0]?.count || 0 },
        expiring: attention.filter((a) => a.kind === "expiring").length,
      },
      attention: attention.slice(0, 8),
      attentionTotal: attention.length,
      recentPayments: recentAgg.map((p: any) => ({
        schoolId: String(p.schoolId),
        name: schoolById.get(String(p.schoolId))?.name || "Deleted school",
        invoiceNumber: p.invoiceNumber,
        paymentNo: p.paymentNo || "",
        billingMonth: p.billingMonth,
        amount: p.amount || 0,
        date: p.date,
      })),
      plans: [...planCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      topSchools: studentsBySchool
        .filter((r: any) => schoolById.has(String(r._id)))
        .slice(0, 5)
        .map((r: any) => ({
          schoolId: String(r._id),
          name: schoolById.get(String(r._id)).name,
          students: r.n,
        })),
    });
  } catch (error: any) {
    console.error("Superadmin dashboard error:", error?.message);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}