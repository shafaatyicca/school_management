import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";
import Student from "@/models/Student";
import { requirePermission, schoolIdFor } from "@/lib/access";

const StudentM = Student as any; // avoids Mongoose union-type errors on Vercel
const ClassM = ClassModel as any;
const fail = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status });

// GET ?schoolId=
// → classes (name, sections, order) + counts per class + section + status + gender
export async function GET(req: Request) {
  try {
    const { access, error } = await requirePermission("classSummary", "view");
    if (error || !access) return error ?? fail(401, "Unauthorized");

    await connectDB();
    const sp = new URL(req.url).searchParams;
    const schoolId = schoolIdFor(access, sp.get("schoolId"));
    if (!schoolId) return fail(400, "School ID missing");

    const [classes, groups] = await Promise.all([
      ClassM.find({ schoolId }).select("name sections order").sort({ order: 1, name: 1 }).lean(),
      StudentM.aggregate([
        { $match: { schoolId: String(schoolId) } },
        {
          $group: {
            _id: {
              classId: "$classId",
              section: "$section",
              status: "$status",
              gender: { $toLower: { $ifNull: ["$gender", ""] } },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const rows = groups.map((g: any) => ({
      classId: g._id.classId ? String(g._id.classId) : "",
      section: g._id.section || "",
      status: g._id.status || "active",
      gender: g._id.gender || "",
      count: g.count,
    }));

    return NextResponse.json({ success: true, classes, rows });
  } catch (error: any) {
    console.error("Class summary API error:", error?.message);
    return fail(500, "Something went wrong");
  }
}