import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- GET: Fetch Students ---
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");

    const filter: any = { schoolId }; // Hamesha sirf apne school ka data
    if (parentId) filter.parentId = parentId;

    const students = await Student.find(filter)
      .populate("classId")
      .populate("parentId")
      .sort(parentId ? { fullName: 1 } : { grNumber: -1 });

    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// --- POST: Create Student & Parent ---
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { isNewParent, parentData, email, ...studentData } = body;

    let finalParentId = studentData.parentId;

    // 1. Agar naya parent hai toh create karein
    if (isNewParent && parentData) {
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: schoolId, // Session se schoolId li
      });
      finalParentId = newParent._id;
    }

    const newStudent = await Student.create({
      ...studentData,
      schoolId: schoolId, // Forcefully session wali ID
      parentId: finalParentId || undefined,
    });

    // 3. Cloudinary Tag Management
    if (newStudent.image && newStudent.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(newStudent.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");

      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    const populated = await Student.findById(newStudent._id)
      .populate("classId")
      .populate("parentId");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// --- PUT: Update Student & Parent ---
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const body = await req.json(); // pehle body lo
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, isNewParent, parentData, email, ...updateData } = body;

    let finalParentId = updateData.parentId;

    if (isNewParent && parentData) {
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: schoolId,
      });
      finalParentId = newParent._id;
    }

    // 2. Student Update (Security: Filter by ID and schoolId)
    const updatedDoc = await Student.findOneAndUpdate(
      { _id: id, schoolId },
      {
        ...updateData,
        parentId: finalParentId,
      },
      { new: true, runValidators: true },
    )
      .populate("classId")
      .populate("parentId");

    if (!updatedDoc) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 },
      );
    }

    // 3. Cloudinary logic for updated image
    if (updatedDoc.image && updatedDoc.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(updatedDoc.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");

      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    return NextResponse.json(updatedDoc);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const { id, schoolId: bodySchoolId } = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? bodySchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Pehle check ke student isi school ka hai
    const student = await Student.findOne({ _id: id, schoolId });
    if (!student) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 },
      );
    }

    await Student.deleteOne({ _id: id, schoolId });

    // Cloudinary cleanup
    if (student.image && student.image.includes("cloudinary")) {
      deleteImage(student.image).catch((err) =>
        console.error("Cloudinary delete failed:", err),
      );
    }

    return NextResponse.json({ message: "Student Deleted" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
