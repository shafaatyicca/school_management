import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { ClassModel } from "@/models/Class";
import Parent from "@/models/Parent";
import { FeeDiscount } from "@/models/FeeDiscount";
import "@/models/FeeCategory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const searchInput = searchParams.get("studentId")?.trim();
    const urlSchoolId = searchParams.get("schoolId");
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { message: "Unauthorized - School ID missing" },
        { status: 401 },
      );
    }

    if (!searchInput) {
      return NextResponse.json(
        { message: "Search input required" },
        { status: 400 },
      );
    }
    let studentSearchConditions: any = { schoolId };
    const orConditions: any[] = [
      { fullName: { $regex: searchInput, $options: "i" } },
    ];

    if (!isNaN(Number(searchInput)) && searchInput !== "") {
      orConditions.push({ grNumber: Number(searchInput) });
    }
    if (mongoose.isValidObjectId(searchInput)) {
      orConditions.push({ _id: searchInput });
    }

    studentSearchConditions.$or = orConditions;

    const matchedStudent = await Student.findOne(studentSearchConditions)
      .populate("classId", "name classFee")
      .populate("parentId", "fullName phone address");

    if (!matchedStudent) {
      return NextResponse.json(
        { message: "Student not found in this school" },
        { status: 404 },
      );
    }

    const studentDiscounts = await FeeDiscount.find({
      studentId: matchedStudent._id,
      schoolId: schoolId,
    }as any).populate("feeCategoryId", "name");

    const baseFee = (matchedStudent.classId as any)?.classFee || 0;
    const totalDiscount = studentDiscounts.reduce(
      (sum, d) => sum + (baseFee - d.customNetFee),
      0,
    );
    const netPayable = baseFee - totalDiscount;

    // Fetch Data
    const invoices = await StudentFeeInvoice.find({
      studentId: matchedStudent._id,
      schoolId: schoolId,
    } as any)
      .populate({
        path: "studentId",
        model: Student,
        populate: [
          { path: "classId", model: ClassModel, select: "name classFee" },
          { path: "parentId", model: Parent, select: "fullName phone address" },
        ],
      })
      .exec();

    // Fallback: Agar koi invoice nahi to profile return kare
    if (!invoices || invoices.length === 0) {
      return NextResponse.json([
        {
          _id: "dummy_record",
          studentId: matchedStudent.toObject(),
          discounts: studentDiscounts,
          baseFee: baseFee,
          netPayable: netPayable,
          isDummy: true,
        }
      ]);
    }
    const responseData = invoices.map((inv) => ({
      ...inv.toObject(),
      studentId: {
        ...(inv.studentId  as any).toObject(),
        discounts: studentDiscounts,
        netPayable: netPayable,
      },
    }));

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
