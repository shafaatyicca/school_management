import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const schoolId = searchParams.get("schoolId");

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (parentId) filter.parentId = parentId;

    if (parentId) {
      const siblings = await Student.find(filter)
        .populate("classId")
        .populate("parentId")
        .sort({ fullName: 1 });
      return NextResponse.json(siblings);
    }

    const students = await Student.find(filter)
      .populate("classId")
      .populate("parentId")
      .sort({ grNumber: -1 });

    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { isNewParent, parentData, email, ...studentData } = body;

    let finalParentId = studentData.parentId;

    if (isNewParent && parentData) {
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: studentData.schoolId,
      });
      finalParentId = newParent._id;
    }

    const newStudent = await Student.create({
      ...studentData,
      parentId: finalParentId || undefined,
    });

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
    console.error("POST Error:", error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, isNewParent, parentData, email, ...updateData } = body;

    let finalParentId = updateData.parentId;
    if (isNewParent && parentData) {
      const newParent = await ParentModel.create({
        ...parentData,
        schoolId: updateData.schoolId,
      });
      finalParentId = newParent._id;
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      {
        ...updateData,
        parentId: finalParentId,
      },
      { new: true, runValidators: true },
    )
      .populate("classId")
      .populate("parentId");

    if (updated?.image && updated.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(updated.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");
      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 },
      );
    }

    // ✅ Pehle DB se delete karo
    await Student.findByIdAndDelete(id);

    // ✅ Background mein Cloudinary se delete karo
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
