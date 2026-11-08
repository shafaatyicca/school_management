import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import "@/models/Class"; // populate ke liye model register
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET → typing ke dauran students ki list (dropdown ke liye, max 10)
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const urlSchoolId = searchParams.get("schoolId");
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? urlSchoolId : session.user.schoolId;

    if (!schoolId || !q) return NextResponse.json([]);

    // Regex ke special characters safe karo
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const orConditions: any[] = [
      { fullName: { $regex: escaped, $options: "i" } },
    ];

    // Number type kiya → GR number us se shuru ho (1 → 1, 12, 105...)
    if (/^\d+$/.test(q)) {
      orConditions.push({
        $expr: {
          $regexMatch: { input: { $toString: "$grNumber" }, regex: `^${q}` },
        },
      });
    }

    const students: any[] = await Student.find({
      schoolId,
      $or: orConditions,
    } as any)
      .select("fullName grNumber section classId image")
      .populate("classId", "name")
      .sort({ grNumber: 1 })
      .limit(10)
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