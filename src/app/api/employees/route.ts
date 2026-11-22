import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import cloudinary, { deleteImage } from "@/lib/cloudinary-server";
import { getAccess, requirePermission, schoolIdFor, logActivity, diffChanges } from "@/lib/access";

// Fields shown in the activity log (all fields of models/Employee.ts; password is never logged)
const LOG_FIELDS = [
  "fullName",
  "image",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "nicNumber",
  "staffCategory",
  "qualification",
  "designation",
  "experience",
  "subject",
  "address",
  "salary",
  "joiningDate",
  "status",
  "inactiveDate",
  "inactiveReason",
  "emergencyContact.name",
  "emergencyContact.phone",
  "emergencyContact.relation",
];
// Fields the client may never set (emp_id is made by the model)
const BLOCKED = ["_id", "id", "schoolId", "role", "userId", "emp_id", "createdAt", "updatedAt", "__v"];

const isOid = (v: any) => !!v && v !== "undefined" && mongoose.Types.ObjectId.isValid(String(v));

function cleanBody(input: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (!BLOCKED.includes(k)) out[k] = v;
  }
  return out;
}

// Emergency contact is an object → flat keys so each part is logged on its own
const flat = (e: any) => ({
  ...(e || {}),
  "emergencyContact.name": e?.emergencyContact?.name,
  "emergencyContact.phone": e?.emergencyContact?.phone,
  "emergencyContact.relation": e?.emergencyContact?.relation,
});

// "Ali Raza (EMP 12)"
const labelOf = (e: any) => `${e?.fullName || "Employee"}${e?.emp_id ? ` (EMP ${e.emp_id})` : ""}`;

// Uploaded image is now in use → remove its "pending" tag (so cleanup keeps it)
function keepImage(url?: string) {
  if (!url || !url.includes("cloudinary")) return;
  try {
    const decodedUrl = decodeURIComponent(url);
    const publicId = decodedUrl
      .split("/upload/")[1]
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");
    cloudinary.uploader
      .remove_tag("pending", [publicId])
      .catch((err: any) => console.error("Tag remove failed:", err));
  } catch (err) {
    console.error("Tag remove failed:", err);
  }
}

// GET → employees of this school (Employees → View)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!access.can("employees", "view")) {
      return NextResponse.json({ message: "You don't have permission to view employees" }, { status: 403 });
    }

    await connectDB();
    const schoolId = schoolIdFor(access, new URL(req.url).searchParams.get("schoolId"));
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Password only for users who can edit employees
    const hide = access.can("employees", "edit") ? "" : "-password";

    const employees = await (Employee as any)
      .find({ schoolId })
      .select(hide)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Employees GET error:", error?.message);
    return NextResponse.json({ message: "Failed to load employees", error: "Failed to load employees" }, { status: 500 });
  }
}

// POST → add employee (Employees → Create)
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("employees", "create");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (!body.fullName || !String(body.fullName).trim()) {
      return NextResponse.json({ message: "Full Name is required" }, { status: 400 });
    }

    // schoolId always from the server; role / ids from the client are ignored
    const employee: any = new Employee({ ...cleanBody(body), schoolId });
    await employee.save();

    keepImage(employee.image);

    logActivity(access!, req, {
      action: "create",
      module: "employees",
      schoolId: String(schoolId),
      entityId: employee._id,
      entityLabel: labelOf(employee),
      summary: "Added employee",
      changes: diffChanges({}, flat(employee.toObject()), LOG_FIELDS),
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error("Employee POST Error:", error?.message);
    // Validation messages (e.g. required field / duplicate) are useful to the user
    const message = error?.name === "ValidationError" || error?.code === 11000 ? error.message : "Failed to add employee";
    return NextResponse.json({ message }, { status: 400 });
  }
}

// PUT → update employee (Employees → Edit)
export async function PUT(req: Request) {
  try {
    const { access, error } = await requirePermission("employees", "edit");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body?.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const updateData = cleanBody(body);

    // Back to active → clear the inactive info
    if (updateData.status === "active") {
      updateData.inactiveDate = null;
      updateData.inactiveReason = "";
    }

    const before: any = await (Employee as any).findOne({ _id: id, schoolId }).lean();
    if (!before) {
      return NextResponse.json({ message: "Employee not found or access denied" }, { status: 404 });
    }

    const updated: any = await (Employee as any).findOneAndUpdate(
      { _id: id, schoolId },
      { $set: updateData },
      { new: true, runValidators: true, lean: true },
    );

    if (!updated) {
      return NextResponse.json({ message: "Employee not found or access denied" }, { status: 404 });
    }

    if (updated.image !== before.image) keepImage(updated.image);

    // What changed (password: only "Changed", never the value)
    const changes: any[] = diffChanges(flat(before), flat(updated), LOG_FIELDS) || [];
    if (updateData.password !== undefined && String(updateData.password) !== String(before.password ?? "")) {
      changes.push({ field: "Password", from: "••••••", to: "Changed" });
    }

    if (changes.length) {
      logActivity(access!, req, {
        action: "update",
        module: "employees",
        schoolId: String(schoolId),
        entityId: id,
        entityLabel: labelOf(updated),
        summary: "Updated employee",
        changes,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Employee PUT Error:", error?.message);
    const message = error?.name === "ValidationError" || error?.code === 11000 ? error.message : "Failed to update employee";
    return NextResponse.json({ message }, { status: 400 });
  }
}

// DELETE → delete employee (Employees → Delete)
export async function DELETE(req: Request) {
  try {
    const { access, error } = await requirePermission("employees", "delete");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!isOid(id)) return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body?.schoolId);
    if (!schoolId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Must belong to this school
    const employee: any = await (Employee as any).findOne({ _id: id, schoolId }).lean();
    if (!employee) {
      return NextResponse.json({ message: "Employee not found in your school" }, { status: 404 });
    }

    await (Employee as any).deleteOne({ _id: id, schoolId });

    // Cloudinary cleanup
    if (employee.image && employee.image.includes("cloudinary")) {
      deleteImage(employee.image).catch((err: any) => console.error("Cloudinary delete failed:", err));
    }

    logActivity(access!, req, {
      action: "delete",
      module: "employees",
      schoolId: String(schoolId),
      entityId: id,
      entityLabel: labelOf(employee),
      summary: "Deleted employee",
      changes: diffChanges(flat(employee), {}, LOG_FIELDS),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Employee DELETE Error:", error?.message);
    return NextResponse.json({ message: "Failed to delete employee" }, { status: 400 });
  }
}