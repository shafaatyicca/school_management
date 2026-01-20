import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";

// GET → list classes
export async function GET() {
  await connectDB();
  const classes = await ClassModel.find().sort({ createdAt: -1 });
  return NextResponse.json(classes);
}

// POST → add class
export async function POST(req: Request) {
  await connectDB();
  const { name, sections } = await req.json();

  if (!name) {
    return NextResponse.json(
      { message: "Class name is required" },
      { status: 400 },
    );
  }

  const newClass = await ClassModel.create({ name, sections });
  return NextResponse.json(newClass, { status: 201 });
}

// PUT → update class
export async function PUT(req: Request) {
  await connectDB();
  const { id, name, sections } = await req.json();

  const updated = await ClassModel.findByIdAndUpdate(
    id,
    { name, sections },
    { new: true },
  );

  return NextResponse.json(updated);
}

// DELETE → delete class
export async function DELETE(req: Request) {
  await connectDB();
  const { id } = await req.json();

  await ClassModel.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
