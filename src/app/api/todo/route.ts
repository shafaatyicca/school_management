import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Todo from "@/models/Todo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const urlSchoolId = searchParams.get("schoolId");
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? urlSchoolId : session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const todos = await Todo.find({ schoolId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: todos });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session.user.schoolId;

    const newTodo = await Todo.create({
      ...body,
      schoolId: schoolId,
    });

    return NextResponse.json({ success: true, data: newTodo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id, ...updateData } = await req.json();
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? updateData.schoolId : session.user.schoolId;
    const updated = await Todo.findOneAndUpdate(
      { _id: id, schoolId },
      updateData,
      { new: true, lean: true },
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Task not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id, schoolId: bodySchoolId } = await req.json();
    const isSuperAdmin = session.user.role === "super_admin";
    const schoolId = isSuperAdmin ? bodySchoolId : session.user.schoolId;

    const result = await Todo.deleteOne({ _id: id, schoolId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
