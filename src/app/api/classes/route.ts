import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/models/Class";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// 1. GET → List classes
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const urlSchoolId = new URL(req.url).searchParams.get("schoolId");
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

// 2. POST → Add class
export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, sections, order } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Class name is required" },
        { status: 400 },
      );
    }

    const newClass = await ClassModel.create({
      name,
      sections: sections || [],
      order: order || 0,
      schoolId,
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 3. PUT → Update class
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? body.schoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, name, sections, order } = body;

    const updated = await ClassModel.findOneAndUpdate(
      { _id: id, schoolId } as any,
      {
        name,
        sections: sections || [],
        order: order,
      },
      {
        new: true,
        lean: true,
      },
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// 4. PATCH → Bulk Order
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const { items, schoolId: bodySchoolId } = await req.json();
    const isSuperAdmin = session?.user?.role === "super_admin";
    const schoolId = isSuperAdmin ? bodySchoolId : session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const updatePromises = items.map((item: any) =>
      ClassModel.findOneAndUpdate({ _id: item.id, schoolId } as any, {
        order: item.order,
      }),
    );

    await Promise.all(updatePromises);
    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Update failed", error: error.message },
      { status: 500 },
    );
  }
}

// 5. DELETE
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const urlSchoolId = searchParams.get("schoolId");
    const schoolId = isSuperAdmin ? urlSchoolId : session?.user?.schoolId;

    if (!id || !schoolId) {
      return NextResponse.json(
        { error: "ID and Session required" },
        { status: 400 },
      );
    }

    const deleted = await ClassModel.findOneAndDelete({
      _id: id,
      schoolId,
    } as any);

    if (!deleted) {
      return NextResponse.json(
        { error: "Class not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
