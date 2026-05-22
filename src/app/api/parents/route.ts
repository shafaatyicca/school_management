import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ParentModel } from "@/models/Parent";
import StudentModel from "@/models/Student";
import "@/models/Class";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- GET: Fetch Parents with their Students ---
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parents = await ParentModel.find({ schoolId })
      .sort({ fullName: 1 })
      .lean();

    const parentsWithStudents = await Promise.all(
      parents.map(async (parent) => {
        // Parent ke bache dhoondo jo isi school mein hon
        const students = await StudentModel.find({
          parentId: parent._id,
          schoolId: schoolId,
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

// --- POST: Create Parent with Auto-Increment p_id ---
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const lastParent = await ParentModel.findOne({ schoolId })
      .sort({ p_id: -1 })
      .lean();

    // 2. Nayi p_id calculate karo
    const nextId = lastParent && lastParent.p_id ? lastParent.p_id + 1 : 1;

    // 3. SchoolId aur p_id inject karke create karo
    const newParent = await ParentModel.create({
      ...body,
      schoolId,
      p_id: nextId,
    });

    return NextResponse.json(newParent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// --- PUT: Update Parent (Secure) ---
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const { id, ...updateData } = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin
      ? updateData.schoolId
      : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // findOneAndUpdate with schoolId security
    const updatedParent = await ParentModel.findOneAndUpdate(
      { _id: id, schoolId } as any,
      updateData,
      { new: true },
    );

    if (!updatedParent) {
      return NextResponse.json(
        { message: "Parent not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedParent);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// --- DELETE: Delete Parent (Secure) ---
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const { id, schoolId: bodySchoolId } = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? bodySchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check before delete
    const parent = await ParentModel.findOne({ _id: id, schoolId } as any);
    if (!parent) {
      return NextResponse.json(
        { message: "Parent not found in your school" },
        { status: 404 },
      );
    }

    await ParentModel.deleteOne({ _id: id, schoolId } as any);

    return NextResponse.json({ message: "Parent deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
