import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ParentModel } from "@/models/Parent";

export async function GET() {
  try {
    await connectDB();
    const parents = await ParentModel.find().sort({ fullName: 1 });
    return NextResponse.json(parents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const newParent = await ParentModel.create(body);
    return NextResponse.json(newParent, { status: 201 });
  } catch (error: any) {
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
