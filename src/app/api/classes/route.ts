import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";
import Student from "@/models/Student";
import { getAccess, schoolIdFor, logActivity, diffChanges } from "@/lib/access";
import { syncTuitionWithClassFee } from "@/lib/feeLock";

// Fields shown in the activity log
const LOG_FIELDS = ["name", "sections", "order", "classFee"];

// 1. GET → classes of this school (any logged-in user — many pages need the list)
//    Each class also gets studentCount (active + inactive) → "Used" / "Empty"
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");
    const schoolId = schoolIdFor(access, urlSchoolId);

    if (!schoolId) {
      return NextResponse.json(
        { message: "Unauthorized: School ID missing" },
        { status: 401 },
      );
    }

    const filter = { schoolId } as any;
    const [classes, counts]: any[] = await Promise.all([
      (ClassModel as any).find(filter).sort({ order: 1, name: 1 }).lean(),
      (Student as any).aggregate([
        { $match: { schoolId } },
        { $group: { _id: "$classId", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c: any) => [String(c._id), c.count]));
    return NextResponse.json(
      classes.map((c: any) => ({ ...c, studentCount: countMap.get(String(c._id)) || 0 })),
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 2. POST → Add class (ONLY SUPER ADMIN)
export async function POST(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can add classes" },
        { status: 403 },
      );
    }

    await connectDB();
    const body = await req.json();
    const schoolId = body.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "School ID is required" }, { status: 400 });
    }

    const { name, sections, order, classFee } = body;
    if (!name) {
      return NextResponse.json({ message: "Class name is required" }, { status: 400 });
    }

    const newClass: any = await ClassModel.create({
      name,
      sections: sections || [],
      order: Number(order || 0),
      classFee: Number(classFee || 0),
      schoolId,
    });

    logActivity(access, req, {
      action: "create",
      module: "classes",
      schoolId: String(schoolId),
      entityId: newClass._id,
      entityLabel: name,
      summary: "Added class",
      changes: diffChanges({}, newClass.toObject(), LOG_FIELDS),
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 3. PUT → Update class (ONLY SUPER ADMIN)
export async function PUT(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can edit classes" },
        { status: 403 },
      );
    }

    await connectDB();
    const body = await req.json();
    const { id, schoolId, name, sections, order, classFee } = body;

    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "Class ID and School ID are required" },
        { status: 400 },
      );
    }

    // Read the old values BEFORE the update (fee sync + log)
    const oldClass: any = await ClassModel.findOne({ _id: id, schoolId } as any)
      .select("name sections order classFee")
      .lean();

    const updated: any = await ClassModel.findOneAndUpdate(
      { _id: id, schoolId } as any,
      {
        $set: {
          name,
          sections: sections || [],
          order: Number(order || 0),
          classFee: Number(classFee || 0),
        },
      },
      { new: true, lean: true },
    );

    if (!updated) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    // Fee changed → sync the students' tuition records
    // (net stays the same, the difference becomes discount)
    const oldFee = Number(oldClass?.classFee) || 0;
    const newFee = Number(updated.classFee) || 0;
    if (oldClass && oldFee !== newFee) {
      await syncTuitionWithClassFee(String(id), oldFee, newFee);
    }

    logActivity(access, req, {
      action: "update",
      module: "classes",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: updated.name,
      summary: "Updated class",
      changes: diffChanges(oldClass || {}, updated, LOG_FIELDS),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 4. PATCH → Bulk order OR fee (Classes → Edit tick)
export async function PATCH(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.can("classes", "edit")) {
      return NextResponse.json(
        { message: "You don't have permission to edit classes" },
        { status: 403 },
      );
    }

    await connectDB();
    const { items, schoolId: bodySchoolId, mode } = await req.json();
    const schoolId = schoolIdFor(access, bodySchoolId);

    if (!schoolId) {
      return NextResponse.json({ message: "School ID is required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "No classes to update" }, { status: 400 });
    }

    // Old values BEFORE the update (fee sync + log) — only this school's classes
    const feeChanging = mode !== "order";
    const oldClasses: any[] = await ClassModel.find({
      _id: { $in: items.map((i: any) => i.id) },
      schoolId,
    } as any)
      .select("name order classFee")
      .lean();
    const oldById = new Map(oldClasses.map((c) => [String(c._id), c]));

    const operations = items.map((item: any) => {
      const updateFields: any = {};
      if (mode === "order") {
        updateFields.order = Number(item.order || 0);
      } else if (mode === "fee") {
        updateFields.classFee = Number(item.classFee || 0);
      } else {
        updateFields.order = Number(item.order || 0);
        updateFields.classFee = Number(item.classFee || 0);
      }

      return {
        updateOne: {
          filter: { _id: item.id, schoolId },
          update: { $set: updateFields },
        },
      };
    });

    // Only ONE request to the database
    await (ClassModel as any).bulkWrite(operations);

    // Classes whose fee changed → sync their students
    const changes: { field: string; from: any; to: any }[] = [];
    let orderChanged = 0;

    for (const item of items) {
      const id = String(item.id);
      const old: any = oldById.get(id);
      if (!old) continue; // class is not of this school

      if (feeChanging) {
        const oldFee = Number(old.classFee) || 0;
        const newFee = Number(item.classFee || 0);
        if (oldFee !== newFee) {
          await syncTuitionWithClassFee(id, oldFee, newFee);
          changes.push({ field: `${old.name} · Fee`, from: oldFee, to: newFee });
        }
      }
      if (mode !== "fee" && Number(old.order || 0) !== Number(item.order || 0)) orderChanged++;
    }

    if (changes.length || orderChanged) {
      const parts: string[] = [];
      if (changes.length) parts.push(`fee of ${changes.length} class(es)`);
      if (orderChanged) parts.push(`order of ${orderChanged} class(es)`);
      logActivity(access, req, {
        action: "update",
        module: "classes",
        schoolId: String(schoolId),
        summary: `Updated ${parts.join(" and ")}`,
        changes,
      });
    }

    return NextResponse.json({ message: "Classes updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: "Update failed", error: error.message }, { status: 500 });
  }
}

// 5. DELETE → Delete class (ONLY SUPER ADMIN, and only an empty class)
export async function DELETE(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
    if (!access.isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can delete classes" },
        { status: 403 },
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");

    if (!id || !schoolId || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID and School ID required" }, { status: 400 });
    }

    // A class with students (active or inactive) can't be deleted
    const studentCount = await (Student as any).countDocuments({ classId: id, schoolId });
    if (studentCount > 0) {
      const text = `This class has ${studentCount} student(s), so it can't be deleted.`;
      return NextResponse.json({ message: text, error: text }, { status: 409 });
    }

    const deleted: any = await ClassModel.findOneAndDelete({ _id: id, schoolId } as any);
    if (!deleted) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    logActivity(access, req, {
      action: "delete",
      module: "classes",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: deleted.name,
      summary: "Deleted class",
      changes: diffChanges(deleted.toObject?.() || deleted, {}, LOG_FIELDS),
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}