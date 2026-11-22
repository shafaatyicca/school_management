import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { getAccess, schoolIdFor, logActivity, diffChanges } from "@/lib/access";

// Fields shown in the activity log
const LOG_FIELDS = ["name", "feeSource", "isMonthly", "maxBaseFee"];

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));
const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

const updateDiscountsForCategory = async (categoryId: string, newMaxBaseFee: number, schoolId: string) => {
  const discounts: any[] = await (FeeDiscount as any).find({ feeCategoryId: categoryId, schoolId });
  if (discounts.length === 0) return;

  const bulkOps = discounts.map((discount: any) => {
    const oldNet = Number(discount.customNetFee ?? newMaxBaseFee);
    const newNet = Math.min(oldNet, newMaxBaseFee); // never more than the base fee
    const discountAmount = Math.max(0, newMaxBaseFee - newNet);

    // Fixed → discount in rupees, Percentage → same discount as a %
    const isPercent = /percent/i.test(String(discount.discountType || ""));
    const discountValue = isPercent
      ? newMaxBaseFee > 0
        ? Math.round((discountAmount / newMaxBaseFee) * 100 * 100) / 100 // 2 decimals
        : 0
      : discountAmount;

    return {
      updateOne: {
        filter: { _id: discount._id },
        update: {
          $set: {
            baseFee: newMaxBaseFee,
            customNetFee: newNet,
            discountValue,
          },
        },
      },
    };
  });

  await (FeeDiscount as any).bulkWrite(bulkOps);
};

// Duplicate "class_fee" category
const duplicateClassFeeResponse = () =>
  bad("This school already has a category linked to Class Fee. A school can have only one.", 409);

// Create / edit / delete: Super Admin only (by design)
async function superAdminOnly(action: string) {
  const access = await getAccess();
  if (!access) return { access: null, error: bad("Unauthorized", 401) };
  if (!access.isSuperAdmin) {
    return { access, error: bad(`Only Super Admin can ${action} fee categories`, 403) };
  }
  return { access, error: null };
}

// 1. GET → Fetch categories
// Used by the Fee Categories page (default), the Fee Ledger (for=fees) and Vouchers (for=vouchers)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return bad("Unauthorized", 401);

    const sp = new URL(req.url).searchParams;
    const purpose = sp.get("for");
    const allowed =
      purpose === "fees"
        ? access.can("fees")
        : purpose === "vouchers"
          ? access.can("vouchers")
          : access.can("feeCategories");

    if (!allowed) return bad("You don't have permission to view fee categories", 403);

    await connectDB();
    // Super Admin: from the URL, everyone else: always their own school
    const schoolId = schoolIdFor(access, sp.get("schoolId"));
    if (!schoolId || !isOid(schoolId)) return bad("School not found");

    const categories = await (FeeCategoryModel as any).find({ schoolId }).sort({ name: 1 }).lean();
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Fee categories GET error:", error?.message);
    return bad("Failed to load fee categories", 500);
  }
}

// 2. POST → Add category (Super Admin only)
export async function POST(req: Request) {
  try {
    const { access, error } = await superAdminOnly("add");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const schoolId = body?.schoolId;
    if (!isOid(schoolId)) return bad("School ID is required");

    const name = String(body?.name || "").trim();
    if (!name) return bad("Category name is required");

    const isClassFee = body.feeSource === "class_fee";
    const fee = Number(body.maxBaseFee || 0);
    if (!isClassFee && (isNaN(fee) || fee < 0)) return bad("Fee must be 0 or more");

    const newCategory = await (FeeCategoryModel as any).create({
      name,
      feeSource: isClassFee ? "class_fee" : "fixed",
      // Class fee category is always monthly with amount 0
      isMonthly: isClassFee ? true : Boolean(body.isMonthly),
      maxBaseFee: isClassFee ? 0 : fee,
      schoolId,
    });

    logActivity(access!, req, {
      action: "create",
      module: "feeCategories",
      schoolId: String(schoolId),
      entityId: newCategory._id,
      entityLabel: name,
      summary: "Added fee category",
      changes: diffChanges({}, newCategory.toObject(), LOG_FIELDS),
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return duplicateClassFeeResponse();
    console.error("Fee categories POST error:", error?.message);
    return bad("Failed to add fee category", 500);
  }
}

// 3. PUT → Update category (Super Admin only)
export async function PUT(req: Request) {
  try {
    const { access, error } = await superAdminOnly("edit");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const { id, schoolId, isMonthly, maxBaseFee, feeSource } = body || {};
    if (!isOid(id) || !isOid(schoolId)) return bad("Category ID and School ID are required");

    const name = String(body?.name || "").trim();
    if (!name) return bad("Category name is required");

    const isClassFee = feeSource === "class_fee";
    const fee = Number(maxBaseFee || 0);
    if (!isClassFee && (isNaN(fee) || fee < 0)) return bad("Fee must be 0 or more");

    // Old values for the log
    const before: any = await (FeeCategoryModel as any).findOne({ _id: id, schoolId }).lean();
    if (!before) return bad("Category not found", 404);

    const updated = await (FeeCategoryModel as any).findOneAndUpdate(
      { _id: id, schoolId },
      {
        $set: {
          name,
          feeSource: isClassFee ? "class_fee" : "fixed",
          isMonthly: isClassFee ? true : Boolean(isMonthly),
          maxBaseFee: isClassFee ? 0 : fee,
        },
      },
      { new: true, lean: true, runValidators: true },
    );
    if (!updated) return bad("Category not found", 404);

    // Only a fixed category's discount records follow the new fee.
    // Class fee discounts use each student's locked fee.
    if (!isClassFee && maxBaseFee !== undefined) {
      await updateDiscountsForCategory(id, fee, String(schoolId));
    }

    logActivity(access!, req, {
      action: "update",
      module: "feeCategories",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: updated.name,
      summary: "Updated fee category",
      changes: diffChanges(before, updated, LOG_FIELDS),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 11000) return duplicateClassFeeResponse();
    console.error("Fee categories PUT error:", error?.message);
    return bad("Failed to update fee category", 500);
  }
}

// 4. DELETE → Delete category (Super Admin only) — ?id=&schoolId=
export async function DELETE(req: Request) {
  // Old frontend reads "error", newer code reads "message" → send both
  const fail = (text: string, status: number) =>
    NextResponse.json({ message: text, error: text }, { status });

  try {
    const { access, error } = await superAdminOnly("delete");
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");
    if (!isOid(id) || !isOid(schoolId)) return fail("ID and School ID are required", 400);

    const category: any = await (FeeCategoryModel as any).findOne({ _id: id, schoolId }).lean();
    if (!category) return fail("Category not found", 404);

    // Invoices keep their category → a used category can't be deleted
    const invoiceCount = await (StudentFeeInvoice as any).countDocuments({ feeCategoryId: id });
    if (invoiceCount > 0) {
      return fail(
        `This category is used in ${invoiceCount} invoice(s), so it can't be deleted. You can rename it instead.`,
        409,
      );
    }

    await (FeeCategoryModel as any).deleteOne({ _id: id, schoolId });
    // Its discount / locked-fee records are of no use any more
    const removed = await (FeeDiscount as any).deleteMany({ feeCategoryId: id, schoolId });

    logActivity(access!, req, {
      action: "delete",
      module: "feeCategories",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: category.name,
      summary: removed?.deletedCount
        ? `Deleted fee category (and ${removed.deletedCount} discount record(s))`
        : "Deleted fee category",
      changes: diffChanges(category, {}, LOG_FIELDS),
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    console.error("Fee categories DELETE error:", error?.message);
    return fail("Delete failed", 500);
  }
}