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
    const slug = searchParams.get("slug");

    // Optional: ?fields=basic → light response (no logo / plan)
    const basic = searchParams.get("fields") === "basic";
    const BASIC_FIELDS = "_id name slug status updatedAt";

    // ?logo=1&id=… or ?logo=1&slug=… → the logo as an IMAGE (browser caches it)
    if (searchParams.get("logo") === "1" && (id || slug)) {
      const s: any = await SchoolModel.findOne(id ? { _id: id } : { slug })
        .select("logo")
        .lean();
      const logo: string = s?.logo || "";
      if (!logo) return new Response(null, { status: 404 });

      // Logo saved as base64 data URL → send the image bytes
      const m = logo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m) {
        return new Response(Buffer.from(m[2], "base64"), {
          headers: {
            "Content-Type": m[1],
            // URL contains ?v=updatedAt, so it is safe to cache for a long time
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
      // Logo saved as a normal URL (e.g. Cloudinary) → redirect to it
      return NextResponse.redirect(new URL(logo, req.url));
    }

    if (id) {
      if (basic) {
        const school = await SchoolModel.findById(id).select(BASIC_FIELDS).lean();
        if (!school)
          return NextResponse.json({ error: "School not found" }, { status: 404 });
        return NextResponse.json(school);
      }

      const school = await SchoolModel.findById(id).populate("planId");
      if (!school)
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 },
        );
      return NextResponse.json(school);
    }

    // Slug → single school (super admin dashboard view)
    if (slug) {
      if (basic) {
        const school = await SchoolModel.findOne({ slug }).select(BASIC_FIELDS).lean();
        if (!school)
          return NextResponse.json({ error: "School not found" }, { status: 404 });
        return NextResponse.json(school);
      }

      const school = await SchoolModel.findOne({ slug }).populate("planId");
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
        school.status = "inactive";
      }
    }
    // -------------------------------------------------------

    return NextResponse.json(schools);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW SCHOOL (koi change nahi)
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

// 3. UPDATE SCHOOL (koi change nahi)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

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

      if (newExpiry > oldExpiry && newExpiry >= today) {
        updateData.status = "active";
      } else if (newExpiry < today) {
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

// 4. DELETE SCHOOL (koi change nahi)
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
