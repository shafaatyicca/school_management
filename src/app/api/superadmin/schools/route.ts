import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import { UserModel } from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Frontend se aane wale data ko sahi variable names mein nikalna
    const { name, address, phone, adminName, adminEmail, adminPassword } = body;

    // Validation: Check karein password khali to nahi
    if (!adminPassword) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    // 1. Check karein ke Admin Email pehle se to nahi hai
    const existingUser = await UserModel.findOne({ email: adminEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Admin email already exists!" },
        { status: 400 },
      );
    }

    // 2. Pehle School create karein
    const newSchool = await SchoolModel.create({
      name,
      address,
      phone,
    });

    // 3. Password Hash karein
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 4. Admin User create karein aur use School ID se link karein
    await UserModel.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "school_admin",
      schoolId: newSchool._id,
    });

    return NextResponse.json(
      { message: "School and Admin Created!" },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const schools = await SchoolModel.find().sort({ createdAt: -1 });
    return NextResponse.json(schools);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 1. School Update karne ke liye
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, name, address, phone } = body;

    const updatedSchool = await SchoolModel.findByIdAndUpdate(
      id,
      { name, address, phone },
      { new: true },
    );

    return NextResponse.json({
      message: "School Updated",
      school: updatedSchool,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. School Delete karne ke liye (Sath uske Users bhi delete ho jayenge)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    await SchoolModel.findByIdAndDelete(id);
    await UserModel.deleteMany({ schoolId: id }); // Cleanup: School gaya to users bhi gaye

    return NextResponse.json({ message: "School and its Admins deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
