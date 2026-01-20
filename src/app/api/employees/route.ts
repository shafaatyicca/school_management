import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";

// GET → list employees
export async function GET() {
  try {
    await connectDB();
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();

    console.log("Found employees:", employees.length);
    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST → add employee
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { message: "Required fields are missing" },
        { status: 400 },
      );
    }

    const newEmployee = await Employee.create(body);
    console.log("Employee created:", newEmployee);

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error("Create Error:", error);
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

    const updated = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
      includeResultMetadata: true,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 },
      );
    }

    console.log("Employee updated:", updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Error:", error);
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

    console.log("Employee deleted:", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
