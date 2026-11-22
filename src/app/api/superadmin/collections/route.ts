import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolInvoiceModel } from "@/models/SchoolInvoice";
import { SchoolModel } from "@/models/School";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pkToday, toYMD, PK_TZ } from "@/lib/pkTime";

export const dynamic = "force-dynamic";

const M = (model: any) => model as any; // avoids Mongoose union-type errors
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&year=YYYY  (Pakistan days)
// → payments received in the range + billed / pending of those months + 12-month strip of `year`
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin" }, { status: 403 });
    }
    await connectDB();

    const sp = new URL(req.url).searchParams;
    const today = toYMD();
    const fromS = YMD.test(sp.get("from") || "") ? (sp.get("from") as string) : today;
    const toS = YMD.test(sp.get("to") || "") ? (sp.get("to") as string) : today;
    if (fromS > toS) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });

    const from = new Date(`${fromS}T00:00:00.000+05:00`);
    const to = new Date(`${toS}T23:59:59.999+05:00`);
    const year = Number(sp.get("year")) || pkToday().y;
    const yearStart = new Date(`${year}-01-01T00:00:00+05:00`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00+05:00`);

    // Billing months covered by the range ("November 2026", ...)
    const months: string[] = [];
    let [y, m] = fromS.split("-").map(Number);
    const [ty, tm] = toS.split("-").map(Number);
    while ((y < ty || (y === ty && m <= tm)) && months.length < 60) {
      months.push(`${MONTHS[m - 1]} ${y}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    const monthRegex = new RegExp(`^(${months.join("|")})$`, "i");

    const [payments, billedAgg, yearAgg, schools]: any[] = await Promise.all([
      // Every payment received in the range
      M(SchoolInvoiceModel).aggregate([
        { $unwind: "$paymentHistory" },
        { $match: { "paymentHistory.date": { $gte: from, $lte: to } } },
        { $sort: { "paymentHistory.date": -1 } },
        {
          $project: {
            _id: 0,
            invoiceId: "$_id",
            invoiceNumber: 1,
            paymentNo: "$paymentHistory.paymentNo",
            schoolId: 1,
            billingMonth: 1,
            amount: "$paymentHistory.amount",
            date: "$paymentHistory.date",
            note: "$paymentHistory.note",
          },
        },
      ]),
      // Bills of those months: billed, still pending, schools with dues
      M(SchoolInvoiceModel).aggregate([
        { $match: { billingMonth: { $regex: monthRegex }, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            billed: { $sum: "$finalAmount" },
            pending: { $sum: "$remainingAmount" },
            invoices: { $sum: 1 },
            pendingSchools: {
              $addToSet: { $cond: [{ $gt: ["$remainingAmount", 0] }, "$schoolId", null] },
            },
          },
        },
      ]),
      // Collected per month of `year` (Pakistan months)
      M(SchoolInvoiceModel).aggregate([
        { $unwind: "$paymentHistory" },
        { $match: { "paymentHistory.date": { $gte: yearStart, $lt: yearEnd } } },
        {
          $group: {
            _id: { $month: { date: "$paymentHistory.date", timezone: PK_TZ } },
            total: { $sum: "$paymentHistory.amount" },
          },
        },
      ]),
      M(SchoolModel).find({}).select("name").sort({ name: 1 }).lean(),
    ]);

    const nameOf = new Map<string, string>(schools.map((s: any) => [String(s._id), s.name]));

    const list = payments.map((p: any) => ({
      invoiceId: String(p.invoiceId),
      invoiceNumber: p.invoiceNumber || "",
      paymentNo: p.paymentNo || "",
      schoolId: String(p.schoolId),
      school: nameOf.get(String(p.schoolId)) || "Deleted school",
      billingMonth: p.billingMonth || "",
      amount: Number(p.amount || 0),
      date: p.date,
      note: p.note || "",
    }));

    const collected = list.reduce((sum: number, p: any) => sum + p.amount, 0);
    const b = billedAgg[0] || {};
    const billed = Number(b.billed || 0);
    const pending = Number(b.pending || 0);

    return NextResponse.json({
      from: fromS,
      to: toS,
      year,
      payments: list,
      totals: {
        collected,
        count: list.length,
        billed,
        invoices: b.invoices || 0,
        pending,
        pendingSchools: (b.pendingSchools || []).filter(Boolean).length,
        recovery: billed > 0 ? Math.round(((billed - pending) / billed) * 100) : 0,
      },
      monthly: Array.from({ length: 12 }, (_, i) => yearAgg.find((r: any) => r._id === i + 1)?.total || 0),
      schools: schools.map((s: any) => ({ _id: String(s._id), name: s.name })),
    });
  } catch (error: any) {
    console.error("Collections GET error:", error?.message);
    return NextResponse.json({ error: "Failed to load collections" }, { status: 500 });
  }
}