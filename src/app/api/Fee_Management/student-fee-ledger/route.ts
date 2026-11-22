import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAccess, schoolIdFor } from "@/lib/access";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import Student from "@/models/Student";
import { ClassModel } from "@/models/Class";
import Parent from "@/models/Parent";
import { FeeDiscount } from "@/models/FeeDiscount";
import "@/models/FeeCategory";

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

// Search text is used as plain text, not as a regex pattern
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Never send passwords to the ledger
const HIDE = "-password -plainPassword";

export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return bad("Unauthorized", 401);
    if (!access.can("fees", "view")) {
      return bad("You don't have permission to view the fee ledger", 403);
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const searchInput = searchParams.get("studentId")?.trim();
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));

    if (!schoolId) return bad("School not found");
    if (!searchInput) return bad("Search input required");

    // Name, GR number or student ID
    const orConditions: any[] = [
      { fullName: { $regex: escapeRegex(searchInput), $options: "i" } },
    ];
    if (!isNaN(Number(searchInput))) orConditions.push({ grNumber: Number(searchInput) });
    if (mongoose.isValidObjectId(searchInput)) orConditions.push({ _id: searchInput });

    const matchedStudent: any = await (Student as any)
      .findOne({ schoolId, $or: orConditions })
      .select(HIDE)
      .populate("classId", "name classFee")
      .populate("parentId", "fullName phone address");

    if (!matchedStudent) return bad("Student not found in this school", 404);

    const studentDiscounts = await (FeeDiscount as any)
      .find({ studentId: matchedStudent._id, schoolId })
      .populate("feeCategoryId", "name feeSource");

    // Tuition (Class Fee) locked record — the student's fee comes from it
    const classFee = matchedStudent.classId?.classFee || 0;
    const tuitionRecord: any = studentDiscounts.find(
      (d: any) => d.feeCategoryId?.feeSource === "class_fee",
    );
    const baseFee = tuitionRecord?.baseFee ?? classFee;
    const netPayable = tuitionRecord ? tuitionRecord.customNetFee : classFee;

    const invoices: any[] = await (StudentFeeInvoice as any)
      .find({ studentId: matchedStudent._id, schoolId })
      .populate({
        path: "studentId",
        model: Student,
        select: HIDE,
        populate: [
          { path: "classId", model: ClassModel, select: "name classFee" },
          { path: "parentId", model: Parent, select: "fullName phone address" },
        ],
      })
      .exec();

    // No invoices yet → return the profile only
    if (!invoices || invoices.length === 0) {
      return NextResponse.json([
        {
          _id: "dummy_record",
          studentId: matchedStudent.toObject(),
          discounts: studentDiscounts,
          baseFee,
          netPayable,
          isDummy: true,
        },
      ]);
    }

    const responseData = invoices.map((inv) => ({
      ...inv.toObject(),
      studentId: {
        ...(inv.studentId?.toObject?.() || matchedStudent.toObject()),
        discounts: studentDiscounts,
        netPayable,
      },
    }));

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Fee ledger error:", error?.message);
    return bad("Failed to load the fee ledger", 500);
  }
}