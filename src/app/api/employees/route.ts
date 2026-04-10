import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";

// GET → list employees (Filtered by schoolId)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const filter = schoolId ? { schoolId } : {};
    const employees = await Employee.find(filter as any)
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST → add employee
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.fullName) {
      return NextResponse.json(
        { message: "Full Name is required" },
        { status: 400 },
      );
    }

    if (!body.schoolId) {
      return NextResponse.json(
        { message: "School ID is required" },
        { status: 400 },
      );
    }

    const employee = new Employee(body);
    await employee.save();

    //  Tag remove karo
    if (employee.image && employee.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(employee.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");
      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error("Employee POST Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// PUT → update employee
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 },
      );
    }

    if (updateData.status === "active") {
      updateData.inactiveDate = null;
      updateData.inactiveReason = "";
    }

    const updated = await Employee.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        lean: true,
        includeResultMetadata: true,
      },
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    //  Tag remove karo
    if (
      (updated as any).image &&
      (updated as any).image.includes("cloudinary")
    ) {
      const decodedUrl = decodeURIComponent((updated as any).image);
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
    console.error("Update Error:", error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// DELETE → delete employee
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 },
      );
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    //  Pehle DB se delete karo
    await Employee.findByIdAndDelete(id);

    //  Background mein Cloudinary se delete karo
    if (employee.image && employee.image.includes("cloudinary")) {
      deleteImage(employee.image).catch((err) =>
        console.error("Cloudinary delete failed:", err),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
