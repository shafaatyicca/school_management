import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import PlanModel from "@/models/Plan";

// 1. GET ALL SCHOOLS
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const school = await SchoolModel.findById(id).populate("planId");
      if (!school)
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 },
        );
      return NextResponse.json(school);
    }

    const schools = await SchoolModel.find({})
      .populate("planId")
      .sort({ createdAt: -1 });

    // --- LOGIC 1: Auto-Expire schools for Super Admin view ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let school of schools) {
      const expiry = new Date(school.expiryDate);
      expiry.setHours(0, 0, 0, 0);

      if (today > expiry && school.status === "active") {
        await SchoolModel.findByIdAndUpdate(school._id, { status: "inactive" });
        school.status = "inactive"; // Local update for immediate UI reflection
      }
    }
    // -------------------------------------------------------

    return NextResponse.json(schools);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW SCHOOL
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      address,
      phone,
      logo,
      planId,
      customPrice,
      expiryDate,
      status,
      slug,
      joiningDate,
    } = body;

    if (!name || !planId || !expiryDate || !slug) {
      return NextResponse.json(
        { error: "School name, Plan, Expiry Date and Slug are required" },
        { status: 400 },
      );
    }

    const newSchool = await SchoolModel.create({
      name,
      address,
      phone,
      logo: logo || "",
      status: status || "active",
      planId,
      customPrice: Number(customPrice) || 0,
      expiryDate: new Date(expiryDate),
      slug,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    });

    return NextResponse.json(newSchool, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. UPDATE SCHOOL
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Purana school data nikalien taake date compare kar saken
    const oldSchool = await SchoolModel.findById(id);
    if (!oldSchool)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (updateData.expiryDate) {
      const newExpiry = new Date(updateData.expiryDate);
      const oldExpiry = new Date(oldSchool.expiryDate);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      newExpiry.setHours(0, 0, 0, 0);
      oldExpiry.setHours(0, 0, 0, 0);

      // --- FIX LOGIC ---
      // 1. Agar Admin ne khud "active/inactive" dropdown chhera hai, to wahi chalne do
      // 2. Lekin agar Admin ne sirf DATE barhayi hai (New > Old), to auto-active kar do
      if (newExpiry > oldExpiry && newExpiry >= today) {
        updateData.status = "active";
      }
      // 3. Agar Admin ne date peeche kar di (Expire kar diya), to auto-inactive kar do
      else if (newExpiry < today) {
        updateData.status = "inactive";
      }
    }

    const updatedSchool = await SchoolModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).populate("planId");

    return NextResponse.json({ message: "Updated", school: updatedSchool });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE SCHOOL
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "School ID required" },
        { status: 400 },
      );

    await SchoolModel.findByIdAndDelete(id);
    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
