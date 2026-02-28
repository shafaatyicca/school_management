import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StudentModel from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import EmployeeModel from "@/models/Employee";
import { SchoolModel } from "@/models/School";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId)
      return NextResponse.json({
        totalStudents: 0,
        totalParents: 0,
        totalTeachers: 0,
        status: "active",
      });

    // Parallel count for better speed
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
