import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { buildVouchers } from "@/lib/buildVoucher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MAX_STUDENTS = 500;

// Super admin sends schoolId; everyone else uses their own school from the session
const resolveSchoolId = (session: any, fromRequest: string | null | undefined) =>
  session?.user?.role === "super_admin" ? fromRequest : session?.user?.schoolId;

// ── GET → single student's voucher (ledger "Print Voucher" button)
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = resolveSchoolId(session, searchParams.get("schoolId"));

    if (!studentId || !schoolId)
      return NextResponse.json({ message: "Student / School missing" }, { status: 400 });

    const { vouchers } = await buildVouchers(String(schoolId), [studentId], new Date());

    if (vouchers.length === 0)
      return NextResponse.json(
        { message: "This student has no pending invoices" },
        { status: 404 },
      );

    return NextResponse.json(vouchers[0]);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// ── POST → bulk vouchers (Fee Voucher page)
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const schoolId = resolveSchoolId(session, body.schoolId);
    const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

    if (!schoolId)
      return NextResponse.json({ message: "School ID missing" }, { status: 400 });
    if (studentIds.length === 0)
      return NextResponse.json({ message: "No students selected" }, { status: 400 });
    if (studentIds.length > MAX_STUDENTS)
      return NextResponse.json(
        { message: `Maximum ${MAX_STUDENTS} students at a time` },
        { status: 400 },
      );

    // Issue date can be past, today or future
    const issueDate = body.issueDate ? new Date(`${body.issueDate}T00:00:00`) : new Date();
    if (isNaN(issueDate.getTime()))
      return NextResponse.json({ message: "Invalid issue date" }, { status: 400 });

    const result = await buildVouchers(String(schoolId), studentIds, issueDate);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}