import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor } from "@/lib/access";
import Student from "@/models/Student";
import "@/models/Class"; // registers the model for populate

// GET → students while typing (dropdown, max 10)
// Used by the search box on: Student Fee Ledger, Bulk Student Bio Data, Fee Voucher Printing
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const allowed =
      access.can("fees", "view") || access.can("bioData", "view") || access.can("vouchers", "view");
    if (!allowed) {
      return NextResponse.json(
        { message: "You don't have permission to search students" },
        { status: 403 },
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 50);
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));

    if (!schoolId || !q) return NextResponse.json([]);

    // Regex special characters become plain text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const orConditions: any[] = [{ fullName: { $regex: escaped, $options: "i" } }];

    // Typed a number → GR numbers starting with it (1 → 1, 12, 105…)
    if (/^\d+$/.test(q)) {
      orConditions.push({
        $expr: {
          $regexMatch: { input: { $toString: "$grNumber" }, regex: `^${q}` },
        },
      });
    }

    const students: any[] = await (Student as any)
      .find({ schoolId, $or: orConditions })
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
    console.error("Student search error:", error?.message);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
}