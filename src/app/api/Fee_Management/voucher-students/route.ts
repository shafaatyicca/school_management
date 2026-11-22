import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor } from "@/lib/access";
import Student from "@/models/Student";
import "@/models/Class";

const M = (model: any) => model as any; // avoids Mongoose union-type errors
const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));

// GET → students of ONE class (?classId=...&section=A | all)  — Fee Voucher Printing
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.can("vouchers", "view")) {
      return NextResponse.json(
        { message: "You don't have permission to print fee vouchers" },
        { status: 403 },
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));
    const classId = searchParams.get("classId");
    const section = searchParams.get("section");

    if (!schoolId || !classId || !isOid(classId)) return NextResponse.json([]);

    const filter: any = { schoolId, classId };
    if (section && section !== "all") filter.section = section;

    const students: any[] = await M(Student)
      .find(filter)
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
    console.error("Voucher students error:", error?.message);
    return NextResponse.json({ message: "Failed to load students" }, { status: 500 });
  }
}