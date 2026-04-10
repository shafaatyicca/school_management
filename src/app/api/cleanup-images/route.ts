import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CLEANUP_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await cloudinary.search
      .expression("tags=pending AND uploaded_at<1d")
      .max_results(100)
      .execute();

    const deleted: string[] = [];

    for (const resource of result.resources) {
      await cloudinary.uploader.destroy(resource.public_id);
      deleted.push(resource.public_id);
    }

    return NextResponse.json({
      message: `${deleted.length} orphan images deleted`,
      deleted,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// if you want to remove orphan images from cloudinary, you can hit url with the help of this Line
// http://localhost:3000/api/cleanup-images?secret=myschool123
