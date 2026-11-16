import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ParentModel } from "@/models/Parent";
import StudentModel from "@/models/Student";
import "@/models/Class";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- GET: Fetch Parents with their Students (2 queries instead of one per parent) ---
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

    // 1. All parents of this school
    const parents: any[] = await ParentModel.find({ schoolId })
      .sort({ fullName: 1 })
      .lean();

    // 2. All their students in ONE query (password never sent to the browser)
    const parentIds = parents.map((p) => p._id);
    const students: any[] = parentIds.length
      ? await StudentModel.find({ schoolId, parentId: { $in: parentIds } } as any)
          .select("grNumber fullName section classId parentId status")
          .populate("classId", "name")
          .lean()
      : [];

    // 3. Group students by parent
    const byParent = new Map<string, any[]>();
    for (const s of students) {
      const key = String(s.parentId);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(s);
    }

    // Same response shape as before: parent fields + students[]
    const parentsWithStudents = parents.map((parent) => ({
      ...parent,
      students: byParent.get(String(parent._id)) || [],
    }));

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
