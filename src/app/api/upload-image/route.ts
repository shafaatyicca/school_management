import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import { uploadImage } from "@/lib/cloudinary-server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { image, schoolId, folder } = await req.json();

    if (!image || !schoolId || !folder) {
      return NextResponse.json(
        { message: "image, schoolId aur folder required hain" },
        { status: 400 },
      );
    }

    // School name fetch karo
    const school = await SchoolModel.findById(schoolId).select("name").lean();
    const schoolName = (school as any)?.name;

    if (!schoolName) {
      return NextResponse.json(
        { message: "School not found" },
        { status: 404 },
      );
    }

    //  Cloudinary pe upload karo
    const url = await uploadImage(image, folder, schoolName);

    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
