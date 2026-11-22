import { FeeDiscount } from "@/models/FeeDiscount";
import { FeeCategoryModel } from "@/models/FeeCategory";
import Student from "@/models/Student";
import { connectDB } from "@/lib/db";
import { ensureTuitionLock } from "@/lib/feeLock";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  getAccess,
  requirePermission,
  schoolIdFor,
  logActivity,
  diffChanges,
} from "@/lib/access";

// Fields shown in the activity log when a discount changes
const LOG_FIELDS = ["baseFee", "customNetFee", "discountType", "discountValue", "remarks"];

// Fields the client may never set
const BLOCKED = ["_id", "id", "schoolId", "studentId", "feeCategoryId", "createdAt", "updatedAt", "__v"];

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

// Super Admin may work without a schoolId; everyone else is locked to their school
const scopeOf = (schoolId: string | null) => (schoolId ? { schoolId } : {});

// Removes fields the client must not change
function cleanBody(input: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (!BLOCKED.includes(k)) out[k] = v;
  }
  return out;
}

// Base fee >= 0 and 0 <= net fee <= base fee (only checks values that are present)
function checkAmounts(data: any, current: any = {}) {
  const base = data.baseFee !== undefined ? Number(data.baseFee) : Number(current.baseFee ?? 0);
  if (isNaN(base) || base < 0) return "Base fee must be 0 or more";
  if (data.customNetFee !== undefined && data.customNetFee !== null) {
    const net = Number(data.customNetFee);
    if (isNaN(net) || net < 0) return "Net fee must be 0 or more";
    if (net > base) return `Net fee cannot be more than the base fee (Rs. ${base.toLocaleString()})`;
  }
  return null;
}

// "Ali Khan (GR 1045) · Tuition Fee"
async function labelFor(studentId: any, feeCategoryId: any) {
  const [student, category]: any[] = await Promise.all([
    (Student as any).findById(studentId).select("fullName grNumber").lean(),
    (FeeCategoryModel as any).findById(feeCategoryId).select("name").lean(),
  ]);
  const who = student ? `${student.fullName} (GR ${student.grNumber})` : "Student";
  return category?.name ? `${who} · ${category.name}` : who;
}

// 1. READ (GET) — Ledger or Fee Discounts "View"
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return bad("Unauthorized", 401);
    if (!access.can("fees", "view") && !access.can("discounts", "view")) {
      return bad("You don't have permission to view fee discounts", 403);
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = schoolIdFor(access, searchParams.get("schoolId"));
    if (!isOid(studentId)) return NextResponse.json([]);

    // Student must belong to this school (Super Admin: any)
    const student: any = await (Student as any)
      .findOne({ _id: studentId, ...scopeOf(schoolId) })
      .select("_id")
      .lean();
    if (!student) return NextResponse.json([]);

    // A student without a tuition record gets its fee locked now
    await ensureTuitionLock(studentId!);

    const discounts = await (FeeDiscount as any)
      .find({ studentId, ...scopeOf(schoolId) })
      .populate("feeCategoryId", "name feeSource");

    return NextResponse.json(discounts);
  } catch (e: any) {
    console.error("Discounts GET error:", e?.message);
    return bad("Failed to load discounts", 500);
  }
}

// 2. CREATE (POST) → updates the record if it exists, otherwise creates it
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("discounts", "create");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body) return bad("Invalid request");

    const { studentId, feeCategoryId, schoolId: bodySchoolId } = body;
    if (!isOid(studentId) || !isOid(feeCategoryId)) return bad("Student and fee category are required");
    const rest = cleanBody(body);
    const requestedSchool = schoolIdFor(access!, bodySchoolId);

    // Student must belong to this school; its school is the real schoolId
    const student: any = await (Student as any)
      .findOne({ _id: studentId, ...scopeOf(requestedSchool) })
      .select("schoolId")
      .lean();
    if (!student) return bad("Student not found in your school", 404);
    const schoolId = String(student.schoolId);

    // Fee category must belong to the same school
    const category: any = await (FeeCategoryModel as any)
      .findOne({ _id: feeCategoryId, schoolId })
      .select("_id")
      .lean();
    if (!category) return bad("Fee category not found in your school", 404);

    const before: any = await (FeeDiscount as any).findOne({ studentId, feeCategoryId }).lean();

    const amountError = checkAmounts(rest, before || {});
    if (amountError) return bad(amountError);

    const discount = await (FeeDiscount as any).findOneAndUpdate(
      { studentId, feeCategoryId },
      { $set: { ...rest, studentId, feeCategoryId, schoolId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    logActivity(access!, req, {
      action: before ? "update" : "create",
      module: "discounts",
      schoolId,
      entityId: discount?._id,
      entityLabel: await labelFor(studentId, feeCategoryId),
      summary: before ? "Updated fee discount" : "Added fee discount",
      changes: diffChanges(before || {}, discount?.toObject?.() || discount, LOG_FIELDS),
    });

    return NextResponse.json(discount, { status: 201 });
  } catch (e: any) {
    console.error("Discounts POST error:", e?.message);
    return bad("Failed to save discount", 500);
  }
}

// 3. EDIT/UPDATE (PUT)
export async function PUT(req: Request) {
  try {
    const { access, error } = await requirePermission("discounts", "edit");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return bad("ID is required");

    // Never moved to another student / category / school
    const updateData = cleanBody(body);

    const schoolId = schoolIdFor(access!, body?.schoolId);
    const before: any = await (FeeDiscount as any).findOne({ _id: id, ...scopeOf(schoolId) }).lean();
    if (!before) return bad("Discount not found in your school", 404);

    const amountError = checkAmounts(updateData, before);
    if (amountError) return bad(amountError);

    // Same response shape as before (includeResultMetadata)
    const updatedDiscount: any = await (FeeDiscount as any).findOneAndUpdate(
      { _id: id, schoolId: before.schoolId },
      { $set: updateData },
      { new: true, lean: true, includeResultMetadata: true, runValidators: true },
    );

    logActivity(access!, req, {
      action: "update",
      module: "discounts",
      schoolId: String(before.schoolId),
      entityId: id,
      entityLabel: await labelFor(before.studentId, before.feeCategoryId),
      summary: "Updated fee discount",
      changes: diffChanges(before, updatedDiscount?.value, LOG_FIELDS),
    });

    return NextResponse.json(updatedDiscount);
  } catch (e: any) {
    console.error("Discounts PUT error:", e?.message);
    return bad("Failed to update discount", 500);
  }
}

// 4. DELETE
export async function DELETE(req: Request) {
  try {
    const { access, error } = await requirePermission("discounts", "delete");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return bad("ID is required");
    const schoolId = schoolIdFor(access!, body?.schoolId);

    const discount: any = await (FeeDiscount as any).findOne({ _id: id, ...scopeOf(schoolId) }).lean();
    if (!discount) return NextResponse.json({ success: true });

    const category: any = await (FeeCategoryModel as any).findById(discount.feeCategoryId).lean();
    const entityLabel = await labelFor(discount.studentId, discount.feeCategoryId);

    // The tuition record is NOT deleted, otherwise the lock breaks
    // and a new lock is made on the new class fee next time.
    // Only the discount is removed and the fee goes back to the locked fee.
    if (category?.feeSource === "class_fee") {
      await (FeeDiscount as any).updateOne(
        { _id: id },
        {
          $set: {
            customNetFee: discount.baseFee,
            discountType: "fixed",
            discountValue: 0,
            remarks: "Discount removed",
          },
        },
      );

      logActivity(access!, req, {
        action: "update",
        module: "discounts",
        schoolId: String(discount.schoolId),
        entityId: id,
        entityLabel,
        summary: "Removed tuition discount (fee reset to locked fee)",
        changes: [
          { field: "customNetFee", from: discount.customNetFee, to: discount.baseFee },
          { field: "discountValue", from: discount.discountValue, to: 0 },
        ],
      });

      return NextResponse.json({ success: true, reset: true });
    }

    await (FeeDiscount as any).deleteOne({ _id: id });

    logActivity(access!, req, {
      action: "delete",
      module: "discounts",
      schoolId: String(discount.schoolId),
      entityId: id,
      entityLabel,
      summary: "Deleted fee discount",
      changes: [
        { field: "customNetFee", from: discount.customNetFee, to: null },
        { field: "discountValue", from: discount.discountValue, to: null },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Discounts DELETE error:", e?.message);
    return bad("Failed to delete discount", 500);
  }
}