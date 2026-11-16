import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import Employee from "@/models/Employee";
import "@/models/Class";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const LIMIT = 5;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "03001234567" also matches "0300-1234567" / "0300 1234567"
const digitsPattern = (d: string) => d.split("").join("[\\s-]*");

// GET → ?q=…&schoolId=… → { students, parents, employees } (max 5 each)
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? searchParams.get("schoolId") : session.user.schoolId;

    const empty = { students: [], parents: [], employees: [] };
    if (!schoolId || q.length < 2) return NextResponse.json(empty);

    const nameRegex = { $regex: escapeRegex(q), $options: "i" };
    const digits = q.replace(/\D/g, "");
    const isNumber = /^\d+$/.test(q.replace(/[\s-]/g, ""));
    const idPrefix = (field: string) => ({
      $expr: { $regexMatch: { input: { $toString: `$${field}` }, regex: `^${digits}` } },
    });
    const looseDigits = digits.length >= 4 ? { $regex: digitsPattern(digits) } : null;

    // ── Students: name, GR (starts with), B-Form
    const studentOr: any[] = [{ fullName: nameRegex }];
    if (isNumber && digits) studentOr.push(idPrefix("grNumber"));
    if (looseDigits) studentOr.push({ bFormNumber: looseDigits });

    // ── Parents: name, P-ID, CNIC, phone
    const parentOr: any[] = [{ fullName: nameRegex }];
    if (isNumber && digits) parentOr.push({ p_id: Number(digits) });
    if (looseDigits) parentOr.push({ cnic: looseDigits }, { phone: looseDigits });

    // ── Employees: name, Employee ID, phone, CNIC
    const employeeOr: any[] = [{ fullName: nameRegex }];
    if (isNumber && digits) employeeOr.push(idPrefix("emp_id"));
    if (looseDigits) employeeOr.push({ phone: looseDigits }, { nicNumber: looseDigits });

    const [students, parents, employees] = await Promise.all([
      (Student as any)
        .find({ schoolId, $or: studentOr })
        .select("fullName grNumber section classId image gender status")
        .populate("classId", "name")
        .sort({ grNumber: 1 })
        .limit(LIMIT)
        .lean(),
      (ParentModel as any)
        .find({ schoolId, $or: parentOr })
        .select("-password")
        .sort({ fullName: 1 })
        .limit(LIMIT)
        .lean(),
      (Employee as any)
        .find({ schoolId, $or: employeeOr })
        .select("-password")
        .sort({ fullName: 1 })
        .limit(LIMIT)
        .lean(),
    ]);

    return NextResponse.json({
      students: students.map((s: any) => ({
        _id: String(s._id),
        fullName: s.fullName,
        grNumber: s.grNumber,
        section: s.section || "",
        className: s.classId?.name || "",
        image: s.image || "",
        gender: s.gender || "",
        status: s.status,
      })),
      parents,
      employees,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}