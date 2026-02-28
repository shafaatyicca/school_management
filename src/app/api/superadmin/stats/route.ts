import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import Student from "@/models/Student";
import Employee from "@/models/Employee";

export async function GET() {
  try {
    await connectDB();

    const [totalSchools, activeSchools, totalStudents, totalEmployees] =
      await Promise.all([
        SchoolModel.countDocuments(),
        SchoolModel.countDocuments({ status: "active" }),
        Student.countDocuments(),
        Employee.countDocuments(),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        totalStudents,
        totalEmployees,
        totalUsers: totalStudents + totalEmployees,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
