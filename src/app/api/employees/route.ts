import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";

// GET → list employees (Filtered by schoolId)
export async function GET(req: Request) {
  // <-- Tabdeeli 1: 'req' parameter add kiya
  try {
    await connectDB();

    // <-- Tabdeeli 2: URL se schoolId pakadna
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const filter = schoolId ? { schoolId } : {};

    const employees = await Employee.find(filter)
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

    // Validation: Full Name check
    if (!body.fullName) {
      return NextResponse.json(
        { message: "Full Name is required" },
        { status: 400 },
      );
    }

    // <-- Tabdeeli 4: Ensure schoolId is present (Optional validation)
    if (!body.schoolId) {
      return NextResponse.json(
        { message: "School ID is required" },
        { status: 400 },
      );
    }
    const employee = new Employee(body);

    await employee.save();

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error("Employee POST Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// PUT → update employee (Aapka logic bilkul wahi rakha hai)
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Error:", error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// DELETE → delete employee (No changes needed)
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
