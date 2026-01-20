import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";

// GET → list students
export async function GET() {
  try {
    await connectDB();
    const students = await Student.find()
      .populate("classId")
      .sort({ createdAt: -1 })
      .lean();

    console.log("Found students:", students.length);
    return NextResponse.json(students);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST → add student
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { message: "Required fields are missing" },
        { status: 400 },
      );
    }

    const newStudent = await Student.create(body);
    console.log("Student created:", newStudent);

    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    console.error("Create Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// PUT → update student
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 },
      );
    }

    const updated = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
      includeResultMetadata: true,
    }).populate("classId");

    if (!updated) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 },
      );
    }

    console.log("Student updated:", updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// DELETE → delete student
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Student ID is required" },
        { status: 400 },
      );
    }

    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 },
      );
    }

    console.log("Student deleted:", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
