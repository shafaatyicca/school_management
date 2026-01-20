import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Teacher from "@/models/Teacher";

// GET → list teachers
export async function GET() {
  try {
    await connectDB();
    const teachers = await Teacher.find().sort({ createdAt: -1 }).lean();

    console.log("Found teachers:", teachers.length);
    return NextResponse.json(teachers);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST → add teacher
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

    const newTeacher = await Teacher.create(body);
    console.log("Teacher created:", newTeacher);

    return NextResponse.json(newTeacher, { status: 201 });
  } catch (error: any) {
    console.error("Create Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// PUT → update teacher
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Teacher ID is required" },
        { status: 400 },
      );
    }

    const updated = await Teacher.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
      includeResultMetadata: true,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 },
      );
    }

    console.log("Teacher updated:", updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// DELETE → delete teacher
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Teacher ID is required" },
        { status: 400 },
      );
    }

    const deleted = await Teacher.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 },
      );
    }

    console.log("Teacher deleted:", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
