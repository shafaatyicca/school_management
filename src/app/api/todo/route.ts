import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Todo from "@/models/Todo";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    // 1. Naya Todo create karte waqt body mein schoolId hona lazmi hai
    const newTodo = await Todo.create(body);
    return NextResponse.json({ success: true, data: newTodo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}

export async function GET(req: Request) {
  // 2. Yahan 'req' parameter add kiya
  try {
    await connectDB();

    // 3. URL se schoolId nikalna (e.g. ?schoolId=123)
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    // 4. Agar schoolId mili hai to filter lagao, warna khali object (ya error de sakte hain)
    const filter = schoolId ? { schoolId } : {};

    const todos = await Todo.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: todos });
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
    const { id, ...updateData } = await req.json();

    // Update karte waqt bhi ensure karein ke id sahi ho
    const updated = await Todo.findByIdAndUpdate(id, updateData, {
      new: true,
      lean: true,
      includeResultMetadata: true,
    });
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
    const { id } = await req.json();
    await Todo.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
