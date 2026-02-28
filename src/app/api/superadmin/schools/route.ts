import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";

// 1. GET ALL SCHOOLS (Wahi rahega)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const school = await SchoolModel.findById(id).select("name logo status"); // status shamil kiya
      if (!school)
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 },
        );
      return NextResponse.json(school);
    }

    const schools = await SchoolModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json(schools);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW SCHOOL (Status fix kiya)
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, address, phone, logo, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: "School name is required" },
        { status: 400 },
      );
    }

    const newSchool = await SchoolModel.create({
      name,
      address,
      phone,
      logo: logo || "",
      status: status || "active",
    });

    return NextResponse.json(newSchool, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE SCHOOL (Fixed Version)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, isActive, status, ...otherData } = body; // status ko alag nikaal liya

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 },
      );
    }

    // Naya update object banayein
    const finalUpdate: any = { ...otherData };

    // Priority 1: Agar status string mojood hai (active ya inactive)
    if (status !== undefined) {
      finalUpdate.status = status;
    }
    // Priority 2: Agar purana isActive boolean mojood hai
    else if (isActive !== undefined) {
      finalUpdate.status = isActive ? "active" : "inactive";
    }

    const updatedSchool = await SchoolModel.findByIdAndUpdate(
      id,
      { $set: finalUpdate }, // Yahan $set ke saath finalUpdate bhejien
      { new: true },
    );

    return NextResponse.json({ message: "Updated", school: updatedSchool });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE SCHOOL (Wahi rahega)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 },
      );
    await SchoolModel.findByIdAndDelete(id);
    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
