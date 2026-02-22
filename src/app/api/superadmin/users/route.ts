import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import bcrypt from "bcryptjs";

// --- Naya Admin Add Karne Ke Liye ---
export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password, schoolId, role } = await req.json();

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists!" },
        { status: 400 },
      );
    }

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

// --- School Ke Admins Get Karne Ke Liye ---
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
