import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ParentModel } from "@/models/Parent";
import StudentModel from "@/models/Student";
import "@/models/Class";

export async function GET(req: Request) {
  try {
    await connectDB();

    // 1. URL se schoolId nikalna
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    // 2. Agar schoolId hai to sirf us school ke parents dhoondo
    const filter = schoolId ? { schoolId } : {};

    const parents = await ParentModel.find(filter).sort({ fullName: 1 }).lean();

    const parentsWithStudents = await Promise.all(
      parents.map(async (parent) => {
        // Sirf usi school ke students dhoondo jo is parent se linked hain
        const students = await StudentModel.find({
          parentId: parent._id,
          ...(schoolId && { schoolId }), // Extra safety: bache bhi usi school ke hon
        })
          .populate("classId")
          .lean();

        return {
          ...parent,
          students: students,
        };
      }),
    );

    return NextResponse.json(parentsWithStudents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { schoolId } = body;
    if (!schoolId) {
      return NextResponse.json(
        { message: "School ID is required" },
        { status: 400 },
      );
    }

    // 1. Is school ke liye sabse bari p_id dhoondo
    const lastParent = await ParentModel.findOne({ schoolId })
      .sort({ p_id: -1 }) // Sabse bara number upar lao
      .lean();

    // 2. Nayi p_id calculate karo (agar koi nahi mila to 1 se shuru karo)
    const nextId = lastParent && lastParent.p_id ? lastParent.p_id + 1 : 1;

    // 3. Body mein p_id shamil karo aur create karo
    const newParent = await ParentModel.create({
      ...body,
      p_id: nextId,
    });

    return NextResponse.json(newParent, { status: 201 });
  } catch (error: any) {
    // Agar ab bhi duplicate error aaye to iska matlab DB index mein masla hai
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

    const updatedParent = await ParentModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return NextResponse.json(updatedParent);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    await ParentModel.findByIdAndDelete(id);
    return NextResponse.json({ message: "Parent deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
