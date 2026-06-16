import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";
import { FeeDiscount } from "@/models/FeeDiscount";
import Student from "@/models/Student";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { FeeCategoryModel } from "@/models/FeeCategory";

// ── Helper: Class fee change hone pe discounts update karo ──────
const updateDiscountsForClass = async (classId: string, newClassFee: number, schoolId: string) => {
  const students = await Student.find({ classId } as any).select("_id");
  const studentIds = students.map((s: any) => s._id);
  if (studentIds.length === 0) return;

 const tuitionCategory = await FeeCategoryModel.findOne({ 
  schoolId, 
  name: "Tuition Fee" 
} as any);

if (!tuitionCategory) return;

const discounts = await FeeDiscount.find({ 
  studentId: { $in: studentIds },
  feeCategoryId: tuitionCategory._id,
} as any);

  if (discounts.length === 0) return;
  const bulkOps = discounts.map((discount: any) => {
    const oldNet = discount.customNetFee;
    const newDiscountValue = newClassFee - oldNet;

    return {
      updateOne: {
        filter: { _id: discount._id },
        update: {
          $set: {
            baseFee: newClassFee,
            discountValue: Math.max(0, newDiscountValue),
          },
        },
      },
    };
  });

  await (FeeDiscount as any).bulkWrite(bulkOps);
};

export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { message: "Unauthorized: School ID missing" },
        { status: 401 },
      );
    }

    const filter = { schoolId } as any;
    const classes = await ClassModel.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();
    return NextResponse.json(classes);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 2. POST → Add class (ONLY SUPER ADMIN)
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can add classes" },
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

    const { name, sections, order, classFee } = body;
    if (!name) {
      return NextResponse.json(
        { message: "Class name is required" },
        { status: 400 },
      );
    }

    const newClass = await ClassModel.create({
      name,
      sections: sections || [],
      order: Number(order || 0),
      classFee: Number(classFee || 0),
      schoolId,
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 3. PUT → Update class (ONLY SUPER ADMIN)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can edit classes" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { id, schoolId, name, sections, order, classFee } = body;

    if (!id || !schoolId) {
      return NextResponse.json(
        { message: "Class ID and School ID are required" },
        { status: 400 },
      );
    }

    const updated = await ClassModel.findOneAndUpdate(
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
    // Class fee change hone pe discounts update karo
    if (classFee !== undefined) {
      await updateDiscountsForClass(id, Number(classFee), schoolId);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 4. PATCH → Bulk Order OR Fee (Optimized with BulkWrite)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session?.user?.role === "super_admin";
    const { items, schoolId: bodySchoolId, mode } = await req.json();

    const schoolId = isSuperAdmin ? bodySchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { message: "School ID is required" },
        { status: 400 },
      );
    }
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

    // POORE DATABASE KO SIRF 1 REQUEST JAYEGI! 🚀
    await (ClassModel as any).bulkWrite(operations);
    // Fee mode mein discounts update karo
    if (mode === "fee") {
      for (const item of items) {
        if (item.classFee !== undefined) {
          await updateDiscountsForClass(item.id, Number(item.classFee), schoolId);
        }
      }
    }
    return NextResponse.json({ message: "Classes updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Update failed", error: error.message },
      { status: 500 },
    );
  }
}

// 5. DELETE → Delete Class (ONLY SUPER ADMIN)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only Super Admin can delete classes" },
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

    const deleted = await ClassModel.findOneAndDelete({
      _id: id,
      schoolId,
    } as any);
    if (!deleted) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
