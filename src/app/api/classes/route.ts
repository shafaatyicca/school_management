import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";

// 1. GET → List classes (Filtered by schoolId)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    // Filter lagaya taake sirf us school ki classes milein
    const filter = schoolId ? { schoolId } : {};

    const classes = await ClassModel.find(filter).sort({ order: 1, name: 1 });
    return NextResponse.json(classes);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 2. POST → Add class
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, sections, order, schoolId } = body; // schoolId receive kiya

    if (!name || !schoolId) {
      return NextResponse.json(
        { message: "Class name and School ID are required" },
        { status: 400 },
      );
    }

    const newClass = await ClassModel.create({
      name,
      sections: sections || [],
      order: order || 0,
      schoolId, // Database mein save kiya
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 3. PUT → Update class
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, name, sections, order, schoolId } = body;

    const updated = await ClassModel.findByIdAndUpdate(
      id,
      {
        name,
        sections: sections || [],
        order: order,
        schoolId, // Safety ke liye schoolId update/keep rakhein
      },
      {
        new: true,
        lean: true,
        includeResultMetadata: true,
      },
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 4. PATCH → Bulk Order (Drag & Drop sorting ke liye)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { items } = await req.json();

    const updatePromises = items.map((item: any) =>
      ClassModel.findByIdAndUpdate(item.id, { order: item.order }),
    );

    await Promise.all(updatePromises);
    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Update failed", error: error.message },
      { status: 500 },
    );
  }
}

// 5. DELETE
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    await ClassModel.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
