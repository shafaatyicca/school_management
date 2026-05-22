import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET → list employees (Securely filtered by session schoolId)
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

    const employees = await Employee.find({ schoolId } as any)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST → add employee (Session based)
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

    if (!body.fullName) {
      return NextResponse.json(
        { message: "Full Name is required" },
        { status: 400 },
      );
    }

    // SchoolId hamesha session se override hogi (Security)
    const employeeData = { ...body, schoolId };
    const employee = new Employee(employeeData);
    await employee.save();

    // ✅ Cloudinary Tag Removal Logic (Intact)
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

// PUT → update employee (Secure update)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const { id, ...updateData } = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin
      ? updateData.schoolId
      : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 },
      );
    }

    // ✅ Aapki original Status Logic (Intact)
    if (updateData.status === "active") {
      updateData.inactiveDate = null;
      updateData.inactiveReason = "";
    }

    // Security: findOneAndUpdate with schoolId
    const updated = await Employee.findOneAndUpdate(
      { _id: id, schoolId } as any,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        lean: true,
      },
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Employee not found or access denied" },
        { status: 404 },
      );
    }

    // ✅ Cloudinary Tag Removal Logic (Intact)
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

// DELETE → delete employee (With security check)
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

    if (!id) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 },
      );
    }

    // Security check: pehle confirm karo ke employee usi school ka hai
    const employee = await Employee.findOne({ _id: id, schoolId } as any);
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found in your school" },
        { status: 404 },
      );
    }

    // ✅ DB se delete karein
    await Employee.deleteOne({ _id: id, schoolId });

    // ✅ Cloudinary Cleanup (Intact)
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
