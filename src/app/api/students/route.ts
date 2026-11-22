import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { checkStudentDelete, deleteStudentLinks } from "@/lib/dataLinks";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";
import { getAccess, requirePermission, schoolIdFor, logActivity, diffChanges } from "@/lib/access";

// Never shown in the log as values (password is logged only as "Changed")
const NOT_LOGGED = ["_id", "id", "schoolId", "createdAt", "updatedAt", "__v", "password"];

// "Ali Khan (GR 1045)"
const labelOf = (s: any) => `${s?.fullName || "Student"}${s?.grNumber != null ? ` (GR ${s.grNumber})` : ""}`;

// Populated refs → plain ids, so the log compares ids (not whole objects)
const plain = (s: any) => ({
  ...(s || {}),
  classId: s?.classId?._id ? String(s.classId._id) : s?.classId ? String(s.classId) : "",
  parentId: s?.parentId?._id ? String(s.parentId._id) : s?.parentId ? String(s.parentId) : "",
});

// --- GET: Fetch Students ---
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const classId = searchParams.get("classId");
    const section = searchParams.get("section");
    const ids = searchParams.get("ids");

    // Pages that list students + parent profile (only its own children)
    const canStudents =
      access.can("students", "view") ||
      access.can("studentInfo", "view") ||
      access.can("bioData", "view") ||
      access.can("admissionForm", "view");
    const canParentChildren = !!parentId && access.can("parents", "view");
    if (!canStudents && !canParentChildren) {
      return NextResponse.json({ message: "You don't have permission to view students" }, { status: 403 });
    }

    await connectDB();
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));
    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const filter: any = { schoolId }; // Always only this school's data
    if (parentId) filter.parentId = parentId;
    if (classId) filter.classId = classId; // Student Information page
    if (section) filter.section = section;
    if (ids) filter._id = { $in: ids.split(",").filter(Boolean) };

    // Student password only for users who can edit students; parent password never
    const hide = access.can("students", "edit") ? "" : "-password";

    const students = await (Student as any)
      .find(filter)
      .select(hide)
      .populate("classId", "name")
      .populate("parentId", "-password")
      .sort(parentId ? { fullName: 1 } : { grNumber: -1 })
      .lean();

    return NextResponse.json(students);
  } catch (error: any) {
    console.error("Students GET error:", error?.message);
    return NextResponse.json({ message: "Failed to load students" }, { status: 500 });
  }
}

// -- POST: Create Student & Parent (Add Student → Create) ---
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("students", "create");
    if (error) return error;

    await connectDB();
    const body = await req.json();
    const schoolId = schoolIdFor(access!, body.schoolId);

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { isNewParent, parentData, email, ...studentData } = body;

    let finalParentId = studentData.parentId;

    // 1. New parent → create it
    if (isNewParent && parentData) {
      const newParent: any = await ParentModel.create({
        ...parentData,
        schoolId: schoolId, // always the server's school
      });
      finalParentId = newParent._id;

      logActivity(access!, req, {
        action: "create",
        module: "parents",
        schoolId: String(schoolId),
        entityId: newParent._id,
        entityLabel: `${newParent.fullName || "Parent"}${newParent.p_id ? ` (P-ID ${newParent.p_id})` : ""}`,
        summary: "Added parent (from the student form)",
      });
    }

    const newStudent: any = await Student.create({
      ...studentData,
      schoolId: schoolId, // always the server's school
      parentId: finalParentId || undefined,
    });

    // 2. Cloudinary tag management
    if (newStudent.image && newStudent.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(newStudent.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");

      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    logActivity(access!, req, {
      action: "create",
      module: "students",
      schoolId: String(schoolId),
      entityId: newStudent._id,
      entityLabel: labelOf(newStudent),
      summary: "Added student",
    });

    const populated = await (Student as any)
      .findById(newStudent._id)
      .populate("classId")
      .populate("parentId", "-password");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error("Students POST error:", error?.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// --- PUT: Update Student & Parent (Add Student → Edit) ---
export async function PUT(req: Request) {
  try {
    const { access, error } = await requirePermission("students", "edit");
    if (error) return error;

    await connectDB();
    const body = await req.json();
    const schoolId = schoolIdFor(access!, body.schoolId);

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, isNewParent, parentData, email, ...updateData } = body;

    // Old values (for the log)
    const before: any = await (Student as any).findOne({ _id: id, schoolId }).lean();
    if (!before) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    let finalParentId = updateData.parentId;

    if (isNewParent && parentData) {
      const newParent: any = await ParentModel.create({
        ...parentData,
        schoolId: schoolId,
      });
      finalParentId = newParent._id;

      logActivity(access!, req, {
        action: "create",
        module: "parents",
        schoolId: String(schoolId),
        entityId: newParent._id,
        entityLabel: `${newParent.fullName || "Parent"}${newParent.p_id ? ` (P-ID ${newParent.p_id})` : ""}`,
        summary: "Added parent (from the student form)",
      });
    }


    // Student update (only this school's student)
    const updatedDoc: any = await (Student as any)
      .findOneAndUpdate(
        { _id: id, schoolId },
        {
          ...updateData,
          schoolId,
          parentId: finalParentId,
        },
        { new: true, runValidators: true },
      )
      .populate("classId")
      .populate("parentId", "-password");

    if (!updatedDoc) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Cloudinary logic for the updated image
    if (updatedDoc.image && updatedDoc.image.includes("cloudinary")) {
      const decodedUrl = decodeURIComponent(updatedDoc.image);
      const publicId = decodedUrl
        .split("/upload/")[1]
        .replace(/^v\d+\//, "")
        .replace(/\.[^/.]+$/, "");

      cloudinary.uploader
        .remove_tag("pending", [publicId])
        .catch((err) => console.error("Tag remove failed:", err));
    }

    // What changed: every field that was sent (password only as "Changed")
    const fields = Object.keys({ ...updateData, parentId: 1 }).filter((k) => !NOT_LOGGED.includes(k));
    const changes: any[] = diffChanges(plain(before), plain(updatedDoc.toObject()), fields) || [];
    if (updateData.password !== undefined && String(updateData.password) !== String(before.password ?? "")) {
      changes.push({ field: "Password", from: "••••••", to: "Changed" });
    }

    if (changes.length) {
      logActivity(access!, req, {
        action: "update",
        module: "students",
        schoolId: String(schoolId),
        entityId: id,
        entityLabel: labelOf(updatedDoc),
        summary: "Updated student",
        changes,
      });
    }

    return NextResponse.json(updatedDoc);
  } catch (error: any) {
    console.error("Students PUT error:", error?.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// --- DELETE: Delete Student (Add Student → Delete) ---
//     { id, schoolId, preview?: true }
//     preview → only says what will be deleted (nothing is removed)
//     Student with fee payments → not allowed (mark Inactive instead)
export async function DELETE(req: Request) {
  try {
    const { access, error } = await requirePermission("students", "delete");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    const schoolId = schoolIdFor(access!, body?.schoolId);

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json({ message: "Student ID is required" }, { status: 400 });
    }

    // The student must belong to this school
    const student: any = await (Student as any).findOne({ _id: id, schoolId });
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Payments (and later marks / attendance) → keep the record
    const { blockers, willDelete } = await checkStudentDelete(String(id));
    if (blockers.length) {
      return NextResponse.json(
        {
          message: `This student has ${blockers.join(" and ")}, so it can't be deleted. Mark the student as Inactive instead.`,
          blockers,
        },
        { status: 409 },
      );
    }

    // Confirm dialog asks first: what will be removed with the student?
    if (body?.preview) {
      return NextResponse.json({ canDelete: true, willDelete });
    }

    // Linked records first, then the student
    await deleteStudentLinks(String(id));
    await (Student as any).deleteOne({ _id: id, schoolId });

    // Cloudinary cleanup
    if (student.image && student.image.includes("cloudinary")) {
      deleteImage(student.image).catch((err) => console.error("Cloudinary delete failed:", err));
    }

    const extra = willDelete.map((w) => `${w.count} ${w.label}`).join(", ");
    logActivity(access!, req, {
      action: "delete",
      module: "students",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: labelOf(student),
      summary: extra ? `Deleted student · Also removed ${extra}` : "Deleted student",
    });

    return NextResponse.json({ message: "Student Deleted" });
  } catch (error: any) {
    console.error("Students DELETE error:", error?.message);
    return NextResponse.json({ message: "Failed to delete student" }, { status: 400 });
  }
}