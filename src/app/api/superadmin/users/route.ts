import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import bcrypt from "bcryptjs";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";

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

export async function POST(req: Request) {
  try {
    await connectDB();
    const {
      name,
      email,
      password,
      schoolId,
      role,
      phone,
      image,
      securityQuestion,
    } = await req.json();

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
      phone,
      image,
      securityQuestion,
    });

    // Cloudinary tag remove karo
    if (newUser.image && newUser.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(newUser.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");
      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    return NextResponse.json(
      { message: "User added", user: newUser },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, name, email, password, phone, image, role, securityQuestion } =
      await req.json();

    const updateData: any = { name, email, phone, image, role };

    if (securityQuestion) {
      updateData.securityQuestion = securityQuestion;
    }

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Cloudinary tag remove karo
    if (updatedUser.image && updatedUser.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(updatedUser.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");
      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    return NextResponse.json({ message: "User updated", user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    const user = await UserModel.findById(id);
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    await UserModel.findByIdAndDelete(id);
    if (user.image && user.image.includes("cloudinary")) {
      deleteImage(user.image).catch((err) =>
        console.error("Cloudinary delete failed:", err),
      );
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
