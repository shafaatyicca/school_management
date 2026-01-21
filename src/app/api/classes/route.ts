import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";

// 1. GET → List classes (Sorted by custom order)
export async function GET() {
  await connectDB();
  // Ab hum 'order' ke mutabiq sort kar rahe hain.
  // Agar do classes ka order same ho, to wo latest created ke mutabiq ayengi.
  const classes = await ClassModel.find().sort({ order: 1, createdAt: -1 });
  return NextResponse.json(classes);
}

// 2. POST → Add class
export async function POST(req: Request) {
  await connectDB();
  const { name, sections } = await req.json();

  if (!name) {
    return NextResponse.json(
      { message: "Class name is required" },
      { status: 400 },
    );
  }

  const newClass = await ClassModel.create({ name, sections, order: 0 });
  return NextResponse.json(newClass, { status: 201 });
}

// 3. PUT → Update single class
export async function PUT(req: Request) {
  await connectDB();
  const { id, name, sections } = await req.json();

  // Yahan order ko touch nahi karna taake edit ke waqt sequence kharab na ho
  const updated = await ClassModel.findByIdAndUpdate(
    id,
    { name, sections },
    {
      new: true,
      lean: true,
      includeResultMetadata: true,
    },
  );

  return NextResponse.json(updated);
}

// 4. PATCH → Bulk Update Order (Naya Method)
export async function PATCH(req: Request) {
  await connectDB();
  try {
    const { items } = await req.json(); // Expected: [{id: '...', order: 1}, ...]

    // Sab updates ko aik saath chalane ke liye Promise.all use kiya hai
    const updatePromises = items.map((item: any) =>
      ClassModel.findByIdAndUpdate(item.id, { order: item.order }),
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Update failed", error },
      { status: 500 },
    );
  }
}

// 5. DELETE → Delete class
export async function DELETE(req: Request) {
  await connectDB();
  const { id } = await req.json();

  await ClassModel.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
