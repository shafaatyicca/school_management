import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    // 1. URL se schoolId pakadna (Zaroori)
    const schoolId = searchParams.get("schoolId");

    // 2. Filter object banana
    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (parentId) filter.parentId = parentId;

    if (parentId) {
      const siblings = await Student.find(filter) // Filter use kiya
        .populate("classId")
        .populate("parentId")
        .sort({ fullName: 1 });
      return NextResponse.json(siblings);
    }

    const students = await Student.find(filter) // Filter use kiya
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
    const { isNewParent, parentData, email, ...studentData } = body;
    let finalParentId = studentData.parentId;

    if (isNewParent && parentData) {
      // 3. Naye Parent mein bhi schoolId save karna taake wo school se link rahe
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: studentData.schoolId,
      });
      finalParentId = newParent._id;
    }

    // 4. Student create karte waqt schoolId body mein honi chahiye
    const newStudent = await Student.create({
      ...studentData,
      parentId: finalParentId || undefined,
    });

    const populated = await Student.findById(newStudent._id)
      .populate("classId")
      .populate("parentId");

    return NextResponse.json(populated, { status: 201 });
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
      // 5. Update case mein bhi agar naya parent banta hai to schoolId dena
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: updateData.schoolId,
      });
      finalParentId = newParent._id;
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      { ...updateData, parentId: finalParentId },
      { new: true, runValidators: true },
    )
      .populate("classId")
      .populate("parentId");

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
