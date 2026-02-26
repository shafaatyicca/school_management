import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";

// 1. GET ALL SCHOOLS
export async function GET() {
  try {
    await connectDB();
    const schools = await SchoolModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json(schools);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW SCHOOL
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, address, phone, logo, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 },
      );
    }

    const newSchool = await SchoolModel.create({
      name,
      address,
      phone,
      logo: logo || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(newSchool, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE SCHOOL
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 },
      );
    }

    const updatedSchool = await SchoolModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    return NextResponse.json({ message: "Updated", school: updatedSchool });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE SCHOOL
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 },
      );
    }

    await SchoolModel.findByIdAndDelete(id);

    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
