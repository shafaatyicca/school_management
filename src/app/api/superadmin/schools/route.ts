import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { SchoolModel } from "@/models/School";
import PlanModel from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { toYMD } from "@/lib/pkTime";
import { deleteImage } from "@/lib/cloudinary-server";
import { countSchoolData, backupSchoolData, deleteSchoolData } from "@/lib/dataLinks";
import { schoolExcel } from "@/lib/schoolExport";
import Student from "@/models/Student";
import { UserModel } from "@/models/User";

// Who is calling? (used by every handler below)
async function getAccess() {
  const session = await getServerSession(authOptions);
  const user: any = session?.user;
  return { user, isSuperAdmin: user?.role === "super_admin" };
}

// 1. GET ALL SCHOOLS
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    // Super admin: everything. Others: only their OWN school (no list)
    const { user, isSuperAdmin } = await getAccess();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSuperAdmin) {
      const ownSchool =
        (id && id === String(user.schoolId)) ||
        (slug && slug === user.schoolSlug);
      if (!ownSchool)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Super Admin only: ?id=&data=summary (what will be deleted) | ?id=&data=backup (download)
    const dataMode = searchParams.get("data");
    if (dataMode && id) {
      if (!isSuperAdmin)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!mongoose.Types.ObjectId.isValid(id))
        return NextResponse.json({ error: "School not found" }, { status: 404 });

      const school: any = await SchoolModel.findById(id).lean();
      if (!school)
        return NextResponse.json({ error: "School not found" }, { status: 404 });

      if (dataMode === "summary") {
        return NextResponse.json({
          school: { name: school.name, slug: school.slug, status: school.status },
          counts: await countSchoolData(id),
        });
      }

      if (dataMode === "backup") {
        const data = await backupSchoolData(id);
        const body = JSON.stringify(
          { exportedAt: new Date().toISOString(), school, ...data },
          null,
          2,
        );
        return new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${school.slug || "school"}-backup-${toYMD()}.json"`,
          },
        });
      }
        if (dataMode === "excel") {
        const buf = await schoolExcel(id, school);
        return new Response(new Uint8Array(buf), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${school.slug || "school"}-data-${toYMD()}.xlsx"`,
          },
        });
      }
    }

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
    const todayKey = toYMD(); // today in Pakistan

    for (let school of schools) {
      if (school.expiryDate && todayKey > toYMD(school.expiryDate) && school.status === "active") {
        await SchoolModel.findByIdAndUpdate(school._id, { status: "inactive" });
        school.status = "inactive";
      }
    }

        // Active students + users per school (for the list and the detail panel)
    const [stCounts, userCounts]: any[] = await Promise.all([
      (Student as any).aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$schoolId", n: { $sum: 1 } } },
      ]),
      (UserModel as any).aggregate([
        { $match: { schoolId: { $ne: null }, role: { $ne: "super_admin" } } },
        { $group: { _id: "$schoolId", n: { $sum: 1 } } },
      ]),
    ]);
    const stMap = new Map<string, number>(stCounts.map((c: any) => [String(c._id), c.n]));
    const usMap = new Map<string, number>(userCounts.map((c: any) => [String(c._id), c.n]));

    return NextResponse.json(
      schools.map((s: any) => ({
        ...s.toObject(),
        studentCount: stMap.get(String(s._id)) || 0,
        userCount: usMap.get(String(s._id)) || 0,
      })),
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CREATE NEW SCHOOL (koi change nahi)
export async function POST(req: Request) {
  try {
    await connectDB();
    const { isSuperAdmin } = await getAccess();
    if (!isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const { isSuperAdmin } = await getAccess();
    if (!isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const oldSchool = await SchoolModel.findById(id);
    if (!oldSchool)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (updateData.expiryDate) {
      if (isNaN(new Date(updateData.expiryDate).getTime())) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
      }

      // Compare Pakistan days ("2026-11-22")
      const todayKey = toYMD();
      const newKey = toYMD(updateData.expiryDate);
      const oldKey = oldSchool.expiryDate ? toYMD(oldSchool.expiryDate) : "";

      if (newKey > oldKey && newKey >= todayKey) {
        updateData.status = "active";
      } else if (newKey < todayKey) {
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

// 4. DELETE SCHOOL — ?id=<id>&confirm=<slug>
//    Only an INACTIVE school, and the slug must be typed.
//    Removes ALL its data. Kept: SchoolInvoice (Super Admin billing), Plans, Super Admin.
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { isSuperAdmin } = await getAccess();
    if (!isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const confirm = (searchParams.get("confirm") || "").trim();

    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "School ID required" }, { status: 400 });

    const school: any = await SchoolModel.findById(id).lean();
    if (!school)
      return NextResponse.json({ error: "School not found" }, { status: 404 });

    if (school.status === "active")
      return NextResponse.json(
        { error: "Make the school inactive before deleting it" },
        { status: 409 },
      );

    if (!confirm || confirm !== school.slug)
      return NextResponse.json(
        { error: "Type the school slug correctly to confirm" },
        { status: 400 },
      );

    // Data first, then the school (if something fails, the school is still there → try again)
    const result = await deleteSchoolData(id);
    await SchoolModel.deleteOne({ _id: id });

    if (school.logo && String(school.logo).includes("cloudinary")) {
      deleteImage(school.logo).catch(() => {});
    }

    return NextResponse.json({ message: "School deleted successfully", ...result });
  } catch (error: any) {
    console.error("School DELETE error:", error?.message);
    return NextResponse.json({ error: "Failed to delete school" }, { status: 500 });
  }
}