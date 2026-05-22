import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentModel from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import EmployeeModel from "@/models/Employee";
import { SchoolModel } from "@/models/School";
import { getServerSession } from "next-auth"; // Session ke liye
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Auth options

export async function GET(req: Request) {
  try {
    await connectDB();

    // 1. Session se user ki details nikalna
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. ID decide karna (Agar Admin hai to session se, agar Super Admin hai to URL se)
    const { searchParams } = new URL(req.url);
    const urlSchoolId = searchParams.get("schoolId");

    // Logic: Agar user super_admin hai, to URL wali ID chalegi.
    // Agar normal admin hai, to sirf uski apni session wali ID chalegi (Security).
    const isSuperAdmin =
      session.user.role === "super_admin" ||
      session.user.role === "super-admin";
    const schoolId = isSuperAdmin ? urlSchoolId : session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({
        totalStudents: 0,
        totalParents: 0,
        totalTeachers: 0,
        status: "active",
      });
    }

    // 3. Parallel count (Aapka purana logic - 100% Correct)
    const [studentCount, parentCount, teacherCount, schoolData] =
      await Promise.all([
        StudentModel.countDocuments({ schoolId }),
        ParentModel.countDocuments({ schoolId }),
        EmployeeModel.countDocuments({ schoolId, staffCategory: "teacher" }),
        SchoolModel.findById(schoolId).select("status"),
      ]);

    return NextResponse.json({
      totalStudents: studentCount,
      totalParents: parentCount,
      totalTeachers: teacherCount,
      status: schoolData?.status || "active",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
