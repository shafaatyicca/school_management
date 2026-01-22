import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";

export async function GET(req: Request) {
  try {
    await connectDB();

    // Query parameters se parentId nikaalein
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");

    // Case 1: Agar parentId diya gaya hai (Siblings fetch karne ke liye)
    if (parentId) {
      const siblings = await Student.find({ parentId })
        .populate("classId")
        .populate("parentId")
        .sort({ fullName: 1 });
      return NextResponse.json(siblings);
    }

    // Case 2: Agar koi parentId nahi hai to saaray students return karein
    const students = await Student.find()
      .populate("classId")
      .populate("parentId")
      .sort({ grNumber: -1 });

    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // UI-only fields ko nikaal kar studentData tayyar karein
    const { isNewParent, parentData, email, ...studentData } = body;

    let finalParentId = studentData.parentId;

    // 1. Agar naya parent hai to pehle wo create karein
    if (isNewParent && parentData) {
      const newParent = await ParentModel.create(parentData);
      finalParentId = newParent._id;
    }

    // 2. Student record create karein (sirf schema fields ke saath)
    const newStudent = await Student.create({
      ...studentData,
      parentId: finalParentId || undefined,
    });

    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, isNewParent, parentData, email, ...updateData } = body;

    let finalParentId = updateData.parentId;
    if (isNewParent && parentData) {
      const newParent = await ParentModel.create(parentData);
      finalParentId = newParent._id;
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      { ...updateData, parentId: finalParentId },
      { new: true, runValidators: true },
    );
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    await Student.findByIdAndDelete(id);
    return NextResponse.json({ message: "Student Deleted" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
