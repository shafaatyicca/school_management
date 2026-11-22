import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor } from "@/lib/access";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import Employee from "@/models/Employee";
import "@/models/Class";

const LIMIT = 5;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "03001234567" also matches "0300-1234567" / "0300 1234567"
const digitsPattern = (d: string) => d.split("").join("[\\s-]*");

// GET → ?q=…&schoolId=… → { students, parents, employees } (max 5 each)
// Each group comes back only if the user may open it (otherwise an empty list)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const empty = { students: [], parents: [], employees: [] };

    // Which groups may this user see?
    const canStudents =
      access.can("students", "view") ||
      access.can("studentInfo", "view") ||
      access.can("fees", "view") ||
      access.can("bioData", "view");
    const canParents = access.can("parents", "view");
    const canEmployees = access.can("employees", "view");
    if (!canStudents && !canParents && !canEmployees) return NextResponse.json(empty);

    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 50);
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));

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

    // Groups without permission are not even queried
    const [students, parents, employees] = await Promise.all([
      canStudents
        ? (Student as any)
            .find({ schoolId, $or: studentOr })
            .select("fullName grNumber section classId image gender status")
            .populate("classId", "name")
            .sort({ grNumber: 1 })
            .limit(LIMIT)
            .lean()
        : [],
      canParents
        ? (ParentModel as any)
            .find({ schoolId, $or: parentOr })
            .select("-password")
            .sort({ fullName: 1 })
            .limit(LIMIT)
            .lean()
        : [],
      canEmployees
        ? (Employee as any)
            .find({ schoolId, $or: employeeOr })
            .select("-password")
            .sort({ fullName: 1 })
            .limit(LIMIT)
            .lean()
        : [],
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
    console.error("Global search error:", error?.message);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
}