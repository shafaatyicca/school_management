import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import bcrypt from "bcryptjs";

// 1. --- GET: School Ke Admins Get Karne Ke Liye ---
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId)
      return NextResponse.json(
        { error: "School ID required" },
        { status: 400 },
      );

    const users = await UserModel.find({ schoolId }).select("-password");
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. --- POST: Naya Admin Add Karne Ke Liye ---
export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password, schoolId, role } = await req.json();

    const existingUser = await UserModel.findOne({ email });
    if (existingUser)
      return NextResponse.json(
        { error: "Email already exists!" },
        { status: 400 },
      );

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || "school_admin",
      schoolId,
    });

    return NextResponse.json(
      { message: "Admin added", user: newUser },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. --- PUT: Admin Details Update Karne Ke Liye ---
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, name, email, password } = await req.json();

    const updateData: any = { name, email };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
      lean: true,
      includeResultMetadata: true,
    });

    if (!updatedUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "Admin updated", user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. --- DELETE: Admin Remove Karne Ke Liye ---
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // URL se ID uthayega (?id=xxx)

    if (!id)
      return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const deletedUser = await UserModel.findByIdAndDelete(id);

    if (!deletedUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "Admin deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
