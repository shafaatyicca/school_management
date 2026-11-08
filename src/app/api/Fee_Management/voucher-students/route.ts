import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import "@/models/Class";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET → students of ONE class (?classId=...&section=A | all)
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schoolId =
      session.user.role === "super_admin"
        ? searchParams.get("schoolId")
        : session.user.schoolId;
    const classId = searchParams.get("classId");
    const section = searchParams.get("section");

    if (!schoolId || !classId) return NextResponse.json([]);

    const filter: any = { schoolId, classId };
    if (section && section !== "all") filter.section = section;

    const students: any[] = await Student.find(filter)
      .select("fullName grNumber section classId image")
      .populate("classId", "name")
      .sort({ grNumber: 1 })
      .lean();

    return NextResponse.json(
      students.map((s) => ({
        _id: String(s._id),
        fullName: s.fullName,
        grNumber: s.grNumber,
        section: s.section || "",
        className: s.classId?.name || "",
        image: s.image || "",
      })),
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}