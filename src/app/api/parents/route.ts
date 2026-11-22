import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ParentModel } from "@/models/Parent";
import StudentModel from "@/models/Student";
import "@/models/Class";
import { getAccess, requirePermission, schoolIdFor, logActivity, diffChanges } from "@/lib/access";

// Fields shown in the activity log (all fields of models/Parent.ts; password is never logged)
const LOG_FIELDS = ["fullName", "cnic", "phone", "address", "occupation", "gender", "email"];

// Fields the client may never set (p_id and email are made by the model)
const BLOCKED = ["_id", "id", "schoolId", "p_id", "email", "createdAt", "updatedAt", "__v"];

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));

function cleanBody(input: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (!BLOCKED.includes(k)) out[k] = v;
  }
  return out;
}

// "Muhammad Khan (P-ID 12)"
const labelOf = (p: any) => `${p?.fullName || "Parent"}${p?.p_id ? ` (P-ID ${p.p_id})` : ""}`;

// Duplicate CNIC → a clear message
const saveError = (error: any, fallback: string) => {
  if (error?.code === 11000 && JSON.stringify(error?.keyPattern || {}).includes("cnic")) {
    return "A parent with this CNIC already exists in this school";
  }
  if (error?.name === "ValidationError") return error.message;
  return fallback;
};

// --- GET: parents with their students
//     Parents → View: full list (password only with Parents → Edit)
//     Add Student (Create/Edit) only: short list for the parent dropdown in the student form
//     ?id= → one parent (parent profile's eye icon)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const canParents = access.can("parents", "view");
    const forStudentForm = access.can("students", "create") || access.can("students", "edit");
    if (!canParents && !forStudentForm) {
      return NextResponse.json({ message: "You don't have permission to view parents" }, { status: 403 });
    }

    await connectDB();
    const schoolId = schoolIdFor(access, new URL(req.url).searchParams.get("schoolId"));
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // ?id= → one parent (parent profile's eye icon). Password only with Parents → Edit
    const oneId = new URL(req.url).searchParams.get("id");
    if (oneId) {
      if (!canParents) {
        return NextResponse.json({ message: "You don't have permission to view parents" }, { status: 403 });
      }
      if (!isOid(oneId)) return NextResponse.json({ message: "Invalid parent" }, { status: 400 });

      const one: any = await (ParentModel as any)
        .findOne({ _id: oneId, schoolId })
        .select(access.can("parents", "edit") ? "" : "-password")
        .lean();
      if (!one) return NextResponse.json({ message: "Parent not found" }, { status: 404 });
      return NextResponse.json(one);
    }

    // Student form only → just what the dropdown needs
    if (!canParents) {
      const list = await (ParentModel as any)
        .find({ schoolId })
        .select("p_id fullName cnic phone")
        .sort({ fullName: 1 })
        .lean();
      return NextResponse.json(list.map((p: any) => ({ ...p, students: [] })));
    }

    // 1. All parents of this school
    const hide = access.can("parents", "edit") ? "" : "-password";
    const parents: any[] = await (ParentModel as any).find({ schoolId }).select(hide).sort({ fullName: 1 }).lean();

    // 2. All their students in ONE query (student password never sent)
    const parentIds = parents.map((p) => p._id);
    const students: any[] = parentIds.length
      ? await (StudentModel as any)
          .find({ schoolId, parentId: { $in: parentIds } })
          .select("grNumber fullName section classId parentId status")
          .populate("classId", "name")
          .lean()
      : [];

    // 3. Group students by parent
    const byParent = new Map<string, any[]>();
    for (const s of students) {
      const key = String(s.parentId);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(s);
    }

    // Same response shape as before: parent fields + students[]
    return NextResponse.json(
      parents.map((parent) => ({ ...parent, students: byParent.get(String(parent._id)) || [] })),
    );
  } catch (error: any) {
    console.error("Parents GET error:", error?.message);
    return NextResponse.json({ message: "Failed to load parents", error: "Failed to load parents" }, { status: 500 });
  }
}

// --- POST: Create parent (Parents → Create). p_id / email / password are made by the model.
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("parents", "create");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const newParent: any = await (ParentModel as any).create({ ...cleanBody(body), schoolId });

    logActivity(access!, req, {
      action: "create",
      module: "parents",
      schoolId: String(schoolId),
      entityId: newParent._id,
      entityLabel: labelOf(newParent),
      summary: "Added parent",
      changes: diffChanges({}, newParent.toObject(), LOG_FIELDS),
    });

    return NextResponse.json(newParent, { status: 201 });
  } catch (error: any) {
    console.error("Parent POST error:", error?.message);
    return NextResponse.json({ message: saveError(error, "Failed to add parent") }, { status: 400 });
  }
}

// --- PUT: Update parent (Parents → Edit)
export async function PUT(req: Request) {
  try {
    const { access, error } = await requirePermission("parents", "edit");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return NextResponse.json({ message: "Parent ID is required" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body?.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const updateData = cleanBody(body);

    const before: any = await (ParentModel as any).findOne({ _id: id, schoolId }).lean();
    if (!before) {
      return NextResponse.json({ message: "Parent not found or access denied" }, { status: 404 });
    }

    const updatedParent: any = await (ParentModel as any).findOneAndUpdate(
      { _id: id, schoolId },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedParent) {
      return NextResponse.json({ message: "Parent not found or access denied" }, { status: 404 });
    }

    // What changed (password: only "Changed", never the value)
    const changes: any[] = diffChanges(before, updatedParent.toObject(), LOG_FIELDS) || [];
    if (updateData.password !== undefined && String(updateData.password) !== String(before.password ?? "")) {
      changes.push({ field: "Password", from: "••••••", to: "Changed" });
    }

    if (changes.length) {
      logActivity(access!, req, {
        action: "update",
        module: "parents",
        schoolId: String(schoolId),
        entityId: id,
        entityLabel: labelOf(updatedParent),
        summary: "Updated parent",
        changes,
      });
    }

    return NextResponse.json(updatedParent);
  } catch (error: any) {
    console.error("Parent PUT error:", error?.message);
    return NextResponse.json({ message: saveError(error, "Failed to update parent") }, { status: 400 });
  }
}

// --- DELETE: Delete parent (Parents → Delete) — only a parent without students
export async function DELETE(req: Request) {
  try {
    const { access, error } = await requirePermission("parents", "delete");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return NextResponse.json({ message: "Parent ID is required" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body?.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Must belong to this school
    const parent: any = await (ParentModel as any).findOne({ _id: id, schoolId }).lean();
    if (!parent) {
      return NextResponse.json({ message: "Parent not found in your school" }, { status: 404 });
    }

    // Students would lose their parent
    const studentCount = await (StudentModel as any).countDocuments({ schoolId, parentId: id });
    if (studentCount > 0) {
      return NextResponse.json(
        { message: `This parent has ${studentCount} student(s). Move or delete the students first.` },
        { status: 409 },
      );
    }

    await (ParentModel as any).deleteOne({ _id: id, schoolId });

    logActivity(access!, req, {
      action: "delete",
      module: "parents",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: labelOf(parent),
      summary: "Deleted parent",
      changes: diffChanges(parent, {}, LOG_FIELDS),
    });

    return NextResponse.json({ message: "Parent deleted successfully" });
  } catch (error: any) {
    console.error("Parent DELETE error:", error?.message);
    return NextResponse.json({ message: "Failed to delete parent" }, { status: 400 });
  }
}