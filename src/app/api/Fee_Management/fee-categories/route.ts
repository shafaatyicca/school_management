import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";


const updateDiscountsForCategory = async (
  categoryId: string,
  newMaxBaseFee: number,
  schoolId: string,
  categoryName: string,
) => {
  if (categoryName === "Tuition Fee") return;

  const discounts = await FeeDiscount.find({
    feeCategoryId: categoryId,
  } as any);

  if (discounts.length === 0) return;

  const bulkOps = discounts.map((discount: any) => {
    const oldNet = discount.customNetFee;
    const newDiscountValue = newMaxBaseFee - oldNet;

    return {
      updateOne: {
        filter: { _id: discount._id },
        update: {
          $set: {
            baseFee: newMaxBaseFee,
            discountValue: Math.max(0, newDiscountValue),
            
          },
        },
      },
    };
  });

  await (FeeDiscount as any).bulkWrite(bulkOps);
};

// 1. GET → Fetch Categories (Dono Admins ke liye open hai)
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");

    // Agar super_admin hai to effectiveSchoolId (URL query) se legi, warna session se
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { message: "Unauthorized: School ID missing" },
        { status: 401 },
      );
    }

    const filter = { schoolId } as any;
    const categories = await FeeCategoryModel.find(filter)
      .sort({ name: 1 })
      .lean();
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 2. POST → Add Category (ONLY SUPER ADMIN)
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can add fee categories" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const schoolId = body.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { message: "School ID is required" },
        { status: 400 },
      );
    }

    const { name, isMonthly, maxBaseFee } = body;
    if (!name) {
      return NextResponse.json(
        { message: "Category name is required" },
        { status: 400 },
      );
    }

    const newCategory = await FeeCategoryModel.create({
      name,
      isMonthly: Boolean(isMonthly),
      maxBaseFee: Number(maxBaseFee || 0),
      schoolId,
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 3. PUT → Update Category (ONLY SUPER ADMIN)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can edit fee categories" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { id, schoolId, name, isMonthly, maxBaseFee } = body;

    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "Category ID and School ID are required" },
        { status: 400 },
      );
    }

    const updated = await FeeCategoryModel.findOneAndUpdate(
  { _id: id, schoolId } as any,
  {
    $set: {
      name,
      isMonthly: Boolean(isMonthly),
      maxBaseFee: Number(maxBaseFee || 0),
    },
  },
  { new: true, lean: true },
);

    if (!updated) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 },
      );
    }
    if (maxBaseFee !== undefined) {
  await updateDiscountsForCategory(id, Number(maxBaseFee), schoolId, name);
}
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 4. DELETE → Delete Category (ONLY SUPER ADMIN)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can delete fee categories" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");

    if (!id || !schoolId) {
      return NextResponse.json(
        { error: "ID and School ID required" },
        { status: 400 },
      );
    }

    const deleted = await FeeCategoryModel.findOneAndDelete({
      _id: id,
      schoolId,
    } as any);
    if (!deleted) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
