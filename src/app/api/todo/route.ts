import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Todo from "@/models/Todo";
import Employee from "@/models/Employee";
import { UserModel } from "@/models/User";
import { getAccess, schoolIdFor, logActivity, diffChanges } from "@/lib/access";

const M = (model: any) => model as any;
const fail = (status: number, message: string) =>
  NextResponse.json({ success: false, message }, { status });

class BadRequest extends Error {}

// Create / edit / delete → only School Admin + Super Admin
async function adminAccess() {
  const access = await getAccess();
  if (!access) return { access: null, error: fail(401, "Unauthorized") };
  if (!access.isSuperAdmin && !access.isSchoolAdmin)
    return { access, error: fail(403, "Only the School Admin can manage tasks") };
  return { access, error: null };
}

// Unique, valid ObjectId strings
const idList = (v: any): string[] =>
  Array.isArray(v)
    ? ([...new Set(v.map((x: any) => String(x)))] as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

// Only these fields can be saved (nothing else from the request)
async function cleanTask(body: any, schoolId: string, partial: boolean) {
  const out: any = {};

  if (!partial || body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) throw new BadRequest("Task title is required");
    out.title = title;
  }

  if (body.description !== undefined) out.description = String(body.description || "").trim();

  // Employees
  const hasEmployees = !partial || body.assignedTo !== undefined;
  if (hasEmployees) {
    const ids = idList(body.assignedTo);
    if (ids.length) {
      const count = await M(Employee).countDocuments({ _id: { $in: ids }, schoolId });
      if (count !== ids.length) throw new BadRequest("Some employees do not belong to this school");
    }
    out.assignedTo = ids;
  }

  // Login users (never the Super Admin)
  const hasUsers = !partial || body.assignedUsers !== undefined;
  if (hasUsers) {
    const ids = idList(body.assignedUsers);
    if (ids.length) {
      const count = await M(UserModel).countDocuments({
        _id: { $in: ids },
        schoolId,
        role: { $ne: "super_admin" },
      });
      if (count !== ids.length) throw new BadRequest("Some users do not belong to this school");
    }
    out.assignedUsers = ids;
  }

  // At least one person
  if (hasEmployees && hasUsers && out.assignedTo.length + out.assignedUsers.length === 0) {
    throw new BadRequest("Please select at least one person");
  }

  if (body.status !== undefined) {
    if (!["pending", "completed"].includes(body.status)) throw new BadRequest("Invalid status");
    out.status = body.status;
  }
  // Priority (new task: Normal if not given)
  if (!partial || body.priority !== undefined) {
    const p = body.priority || "normal";
    if (!["normal", "high", "urgent"].includes(p)) throw new BadRequest("Invalid priority");
    out.priority = p;
  }
  return out;
}

const handleError = (error: any) =>
  error instanceof BadRequest
    ? fail(400, error.message)
    : (console.error("Todo API error:", error?.message), fail(500, "Something went wrong"));

// ── GET → Admins: all tasks of the school. Others: only tasks assigned to them.
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return fail(401, "Unauthorized");

    await connectDB();
    const schoolId = schoolIdFor(access, new URL(req.url).searchParams.get("schoolId"));
    if (!schoolId) return NextResponse.json({ success: true, data: [] });

    const filter: any = { schoolId };
    if (!access.isSuperAdmin && !access.isSchoolAdmin) filter.assignedUsers = String(access.userId);

    const todos = await M(Todo).find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: todos });
  } catch (error: any) {
    return handleError(error);
  }
}

// ── POST → new task (admins)
export async function POST(req: Request) {
  try {
    const { access, error } = await adminAccess();
    if (error) return error;

    await connectDB();
    const body = await req.json();
    const schoolId = schoolIdFor(access!, body.schoolId);
    if (!schoolId) return fail(400, "School ID missing");

    const data = await cleanTask(body, schoolId, false);
    const todo = await M(Todo).create({ ...data, status: data.status || "pending", schoolId });

    logActivity(access!, req, {
      action: "create",
      module: "tasks",
      schoolId,
      entityId: todo._id,
      entityLabel: todo.title,
      summary: "Created task",
    });

    return NextResponse.json({ success: true, data: todo }, { status: 201 });
  } catch (error: any) {
    return handleError(error);
  }
}

// ── PUT → edit task (admins)
export async function PUT(req: Request) {
  try {
    const { access, error } = await adminAccess();
    if (error) return error;

    await connectDB();
    const body = await req.json();
    const { id } = body;
    if (!mongoose.Types.ObjectId.isValid(String(id))) return fail(400, "Invalid task");

    // School Admin: own school only. Super Admin: given school, or the task's own school.
    const requested = schoolIdFor(access!, body.schoolId);
    const filter: any = { _id: id };
    if (requested) filter.schoolId = requested;
    else if (!access!.isSuperAdmin) return fail(400, "School ID missing");

    const before: any = await M(Todo).findOne(filter).lean();
    if (!before) return fail(404, "Task not found");

    const data = await cleanTask(body, before.schoolId, true);
    const updated: any = await M(Todo).findOneAndUpdate(
      { _id: id, schoolId: before.schoolId },
      { $set: data },
      { new: true, lean: true },
    );

    logActivity(access!, req, {
      action: "update",
      module: "tasks",
      schoolId: before.schoolId,
      entityId: id,
      entityLabel: updated?.title || before.title,
      summary: "Updated task",
      changes: diffChanges(before, updated, ["title", "description", "assignedTo", "assignedUsers", "status", "priority"]),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return handleError(error);
  }
}

// ── PATCH → { id, status } — mark done / pending
//    Admins: any task. Others: only a task assigned to them (status only).
export async function PATCH(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return fail(401, "Unauthorized");

    await connectDB();
    const body = await req.json().catch(() => null);
    const id = body?.id;
    const status = body?.status;
    if (!mongoose.Types.ObjectId.isValid(String(id))) return fail(400, "Invalid task");
    if (!["pending", "completed"].includes(status)) return fail(400, "Invalid status");

    const isAdmin = access.isSuperAdmin || access.isSchoolAdmin;
    const requested = schoolIdFor(access, body?.schoolId);
    const filter: any = { _id: id };
    if (requested) filter.schoolId = requested;
    else if (!access.isSuperAdmin) return fail(400, "School ID missing");

    const todo: any = await M(Todo).findOne(filter).lean();
    if (!todo) return fail(404, "Task not found");

    if (!isAdmin && !(todo.assignedUsers || []).map(String).includes(String(access.userId))) {
      return fail(403, "This task is not assigned to you");
    }

    if (todo.status === status) return NextResponse.json({ success: true, data: todo });

    const updated: any = await M(Todo).findOneAndUpdate(
      { _id: id, schoolId: todo.schoolId },
      { $set: { status } },
      { new: true, lean: true },
    );

    logActivity(access, req, {
      action: "update",
      module: "tasks",
      schoolId: todo.schoolId,
      entityId: id,
      entityLabel: todo.title,
      summary: status === "completed" ? "Completed task" : "Reopened task",
      changes: [{ field: "Status", from: todo.status, to: status }],
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return handleError(error);
  }
}

// ── DELETE → remove task (admins)
export async function DELETE(req: Request) {
  try {
    const { access, error } = await adminAccess();
    if (error) return error;

    await connectDB();
    const body = await req.json();
    const { id } = body;
    if (!mongoose.Types.ObjectId.isValid(String(id))) return fail(400, "Invalid task");

    const requested = schoolIdFor(access!, body.schoolId);
    const filter: any = { _id: id };
    if (requested) filter.schoolId = requested;
    else if (!access!.isSuperAdmin) return fail(400, "School ID missing");

    const removed: any = await M(Todo).findOneAndDelete(filter).lean();
    if (!removed) return fail(404, "Task not found");
    logActivity(access!, req, {
      action: "delete",
      module: "tasks",
      schoolId: removed.schoolId,
      entityId: id,
      entityLabel: removed.title,
      summary: "Deleted task",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error);
  }
}