import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentModel from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import EmployeeModel from "@/models/Employee";
import { SchoolModel } from "@/models/School";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const urlSchoolId = searchParams.get("schoolId");
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
