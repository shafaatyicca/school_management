import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";

// 1. GET → List classes
export async function GET() {
  await connectDB();
  // Sort by order ascending, then by name
  const classes = await ClassModel.find().sort({ order: 1, name: 1 });
  return NextResponse.json(classes);
}

// 2. POST → Add class
export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, sections, order } = await req.json(); // Order receive karein

    if (!name) {
      return NextResponse.json(
        { message: "Class name is required" },
        { status: 400 },
      );
    }

    // Sections array format mein hi save honge (jaisa Modal bhej raha hai)
    const newClass = await ClassModel.create({
      name,
      sections: sections || [],
      order: order || 0,
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
    const { id, name, sections, order } = await req.json(); // Order receive karein

    const updated = await ClassModel.findByIdAndUpdate(
      id,
      {
        name,
        sections: sections || [],
        order: order,
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

// 4. PATCH → Bulk Order (Safe rakha hai purane logic ke liye)
export async function PATCH(req: Request) {
  await connectDB();
  try {
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
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    await ClassModel.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
