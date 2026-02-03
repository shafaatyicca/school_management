import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";

// GET → list employees
export async function GET() {
  try {
    await connectDB();
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();
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

    // 1. Validation: Sirf wo cheez check karein jo user ne lazmi deni hay
    if (!body.fullName) {
      return NextResponse.json(
        { message: "Full Name is required" },
        { status: 400 },
      );
    }

    // 2. Create instance (Don't use .create())
    // Hum password/email nahi bhej rahe, Schema hook handle karega
    const employee = new Employee(body);

    // 3. Save (Yehi wo point hay jahan pre-save hook trigger hota hay)
    await employee.save();

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

    // Logic for active status
    if (updateData.status === "active") {
      updateData.inactiveDate = null;
      updateData.inactiveReason = "";
    }

    // IS LINE KO DEKHEIN: Main ne { $set: updateData } add kiya hay
    const updated = await Employee.findByIdAndUpdate(
      id,
      { $set: updateData }, // Yeh ensure karega ke har field update ho
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

    const deleted = await Employee.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
