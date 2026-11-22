import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import { uploadImage } from "@/lib/cloudinary-server";
import { getAccess, schoolIdFor } from "@/lib/access";

// ~5 MB image (base64 is about 4/3 of the file size)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

// POST → { image (base64 data URL), schoolId, folder } → { url }
// Super Admin: any school. Everyone else: always their own school.
export async function POST(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json().catch(() => null);
    const image = body?.image;
    const folder = String(body?.folder || "").trim();
    const schoolId = schoolIdFor(access, body?.schoolId);

    if (!image || !schoolId || !folder) {
      return NextResponse.json({ message: "Image, school and folder are required" }, { status: 400 });
    }

    // Only images
    if (typeof image !== "string" || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(image)) {
      return NextResponse.json({ message: "Only image files can be uploaded" }, { status: 400 });
    }
    if (image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ message: "Image is too large (max 5 MB)" }, { status: 400 });
    }

       // Only the folders uploadImage supports
    const FOLDERS = ["students", "employees", "users"] as const;
    if (!FOLDERS.includes(folder as any)) {
      return NextResponse.json({ message: "Invalid folder" }, { status: 400 });
    }
    const safeFolder = folder as (typeof FOLDERS)[number];

    // School name (used in the Cloudinary path)
    const school: any = await (SchoolModel as any).findById(schoolId).select("name").lean();
    const schoolName = school?.name;
    if (!schoolName) {
      return NextResponse.json({ message: "School not found" }, { status: 404 });
    }

    // Upload to Cloudinary
     const url = await uploadImage(image, safeFolder, schoolName);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload image error:", error?.message);
    return NextResponse.json({ message: "Image upload failed" }, { status: 500 });
  }
}