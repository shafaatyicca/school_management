import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import bcrypt from "bcryptjs";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const User = UserModel as any; // avoids Mongoose union-type errors

// Super Admin only
async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === "super_admin";
}
const forbidden = () =>
  NextResponse.json({ error: "Only Super Admin", message: "Only Super Admin" }, { status: 403 });

// Uploaded image is now in use → remove its "pending" tag
function keepImage(url?: string) {
  if (!url || !url.includes("cloudinary")) return;
  try {
    const publicId = decodeURIComponent(url)
      .split("/upload/")[1]
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");
    cloudinary.uploader
      .remove_tag("pending", [publicId])
      .catch((err: any) => console.error("Tag remove failed:", err));
  } catch (err) {
    console.error("Tag remove failed:", err);
  }
}

export async function GET(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId)
      return NextResponse.json({ error: "School ID required" }, { status: 400 });

    const users = await User.find({ schoolId }).select("-password").sort({ name: 1 });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const { name, email, password, schoolId, role, phone, image, securityQuestion } =
      await req.json();

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return NextResponse.json({ error: "Email already exists!" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "school_admin",
      schoolId,
      phone,
      image,
      securityQuestion,
    });

    keepImage(newUser.image);

    return NextResponse.json({ message: "User added", user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const { id, name, email, password, phone, image, role, securityQuestion } = await req.json();

    const updateData: any = { name, email, phone, image, role };

    if (securityQuestion) {
      updateData.securityQuestion = securityQuestion;
    }

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    keepImage(updatedUser.image);

    return NextResponse.json({ message: "User updated", user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await isSuperAdmin())) return forbidden();
    await connectDB();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await User.findByIdAndDelete(id);
    if (user.image && user.image.includes("cloudinary")) {
      deleteImage(user.image).catch((err: any) => console.error("Cloudinary delete failed:", err));
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}