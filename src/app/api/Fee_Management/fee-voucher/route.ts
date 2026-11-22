import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { buildVouchers } from "@/lib/buildVoucher";
import Student from "@/models/Student";
import { requirePermission, schoolIdFor, logActivity } from "@/lib/access";

const MAX_STUDENTS = 500;

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

// Keep only students that really belong to this school
async function ownStudents(schoolId: string, ids: string[]) {
  const valid = [...new Set(ids.map(String))].filter(isOid); // no bad / duplicate IDs
  if (valid.length === 0) return [];
  const found: any[] = await (Student as any)
    .find({ _id: { $in: valid }, schoolId })
    .select("_id")
    .lean();
  return found.map((s) => String(s._id));
}

// "2026-11-20" or a full date → Date (midnight for a plain date)
function parseIssueDate(input: any): Date | null {
  if (!input) return new Date();
  const s = String(input);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+05:00`) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── GET → single student's voucher (ledger "Print Voucher" button)
export async function GET(req: Request) {
  try {
    const { access, error } = await requirePermission("fees", "export");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = schoolIdFor(access!, searchParams.get("schoolId"));

    if (!isOid(studentId) || !schoolId) return bad("Student / School missing");

    const [ownId] = await ownStudents(schoolId, [studentId!]);
    if (!ownId) return bad("Student not found in your school", 404);

    const { vouchers } = await buildVouchers(String(schoolId), [ownId], new Date());
    if (vouchers.length === 0) return bad("This student has no pending invoices", 404);

    const v: any = vouchers[0];
    logActivity(access!, req, {
      action: "print",
      module: "fees",
      schoolId,
      entityId: ownId,
      entityLabel: v?.student ? `${v.student.name} (GR ${v.student.grNumber})` : "",
      summary: `Printed fee voucher · Rs. ${Number(v?.withinDue || 0).toLocaleString("en-US")}`,
    });

    return NextResponse.json(v);
  } catch (error: any) {
    console.error("Voucher GET error:", error?.message);
    return bad("Failed to generate voucher", 500);
  }
}

// ── POST → bulk vouchers (Fee Voucher page)
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("vouchers", "export");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Invalid request");

    const schoolId = schoolIdFor(access!, body.schoolId);
    const requested: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

    if (!schoolId) return bad("School ID missing");
    if (requested.length === 0) return bad("No students selected");
    if (requested.length > MAX_STUDENTS) return bad(`Maximum ${MAX_STUDENTS} students at a time`);

    // Issue date can be past, today or future
    const issueDate = parseIssueDate(body.issueDate);
    if (!issueDate) return bad("Invalid issue date");

    // Students of other schools (and bad IDs) are silently dropped
    const studentIds = await ownStudents(schoolId, requested);
    if (studentIds.length === 0) return bad("No students found in your school", 404);

    const result: any = await buildVouchers(String(schoolId), studentIds, issueDate);

    const total = (result.vouchers || []).reduce(
      (sum: number, v: any) => sum + (Number(v.withinDue) || 0),
      0,
    );
    logActivity(access!, req, {
      action: "print",
      module: "vouchers",
      schoolId,
      summary: `Generated ${result.vouchers?.length || 0} fee voucher(s) · Rs. ${total.toLocaleString("en-US")}`,
      entityLabel: `Issue date ${body.issueDate || "today"}${
        result.skipped ? ` · ${result.skipped} skipped (no dues)` : ""
      }`,
    });


    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Voucher POST error:", error?.message);
    return bad("Failed to generate vouchers", 500);
  }
}