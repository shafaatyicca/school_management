import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { RoleModel, ensureDefaultRoles } from "@/models/Role";
import { getAccess, clearAccessCache, logActivity } from "@/lib/access";
import {
  sanitizePermissions,
  normalizePermissions,
  describePermissionChanges,
} from "@/lib/permissions";

async function superAdminOnly() {
  const access = await getAccess();
  if (!access) return { access: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  if (!access.isSuperAdmin)
    return { access, error: NextResponse.json({ message: "Only Super Admin" }, { status: 403 }) };
  return { access, error: null };
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "role";

// How many users of THIS school use the role
async function usersOf(role: any) {
  return (UserModel as any).countDocuments({
    schoolId: role.schoolId,
    $or: [{ roleId: role._id }, { roleId: null, role: role.key }],
  });
}

// GET ?schoolId=… → roles of that school + user counts
export async function GET(req: Request) {
  const { error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const schoolId = new URL(req.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });

  await ensureDefaultRoles(schoolId);
  const roles: any[] = await (RoleModel as any)
    .find({ schoolId })
    .sort({ isSystem: -1, name: 1 })
    .lean();
  const counts = await Promise.all(roles.map(usersOf));

  // Old roles without widgets get their template's widgets (what they really have)
  return NextResponse.json(
    roles.map((r, i) => ({
      ...r,
      permissions: normalizePermissions(r.permissions, r.key),
      userCount: counts[i],
    })),
  );
}

// POST → { schoolId, name, permissions } → new role in that school
export async function POST(req: Request) {
  const { access, error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const { schoolId, name, permissions } = await req.json();
  const clean = String(name || "").trim();
  if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });
  if (!clean) return NextResponse.json({ message: "Role name is required" }, { status: 400 });

  // Unique key inside this school
  let key = slugify(clean);
  let n = 1;
  while (await (RoleModel as any).exists({ schoolId, key })) key = `${slugify(clean)}-${++n}`;

  const role = await (RoleModel as any).create({
    schoolId,
    key,
    name: clean,
    isSystem: false,
    permissions: sanitizePermissions(permissions),
  });

  logActivity(access!, req, {
    action: "create",
    module: "access",
    schoolId,
    entityId: role._id,
    entityLabel: clean,
    summary: "Created role",
    changes: describePermissionChanges({}, role.permissions),
  });

  return NextResponse.json(role, { status: 201 });
}

// PUT → { schoolId, id, name, permissions } → applies to this school's users only
export async function PUT(req: Request) {
  const { access, error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const { schoolId, id, name, permissions } = await req.json();
  const before: any = await (RoleModel as any).findOne({ _id: id, schoolId }).lean();
  if (!before) return NextResponse.json({ message: "Role not found in this school" }, { status: 404 });

  const clean = String(name || before.name).trim();
  const role = await (RoleModel as any).findOneAndUpdate(
    { _id: id, schoolId },
    { $set: { name: clean, permissions: sanitizePermissions(permissions) } },
    { new: true, lean: true },
  );
  clearAccessCache(); // applies immediately

  const changes: any[] = [];
  if (before.name !== clean) changes.push({ field: "Role name", from: before.name, to: clean });
  changes.push(
    ...describePermissionChanges(
      normalizePermissions(before.permissions, before.key), // what it really had
      role.permissions,
    ),
  );

  logActivity(access!, req, {
    action: "update",
    module: "access",
    schoolId,
    entityId: id,
    entityLabel: clean,
    summary: "Updated role permissions",
    changes,
  });

  return NextResponse.json(role);
}

// DELETE → { schoolId, id } (custom roles only, and only when no user has it)
export async function DELETE(req: Request) {
  const { access, error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const { schoolId, id } = await req.json();
  const role: any = await (RoleModel as any).findOne({ _id: id, schoolId }).lean();
  if (!role) return NextResponse.json({ message: "Role not found in this school" }, { status: 404 });
  if (role.isSystem)
    return NextResponse.json({ message: "Default roles cannot be deleted" }, { status: 400 });

  const count = await usersOf(role);
  if (count > 0)
    return NextResponse.json(
      { message: `${count} user(s) still have this role. Change their role first.` },
      { status: 400 },
    );

    
  await (RoleModel as any).deleteOne({ _id: id, schoolId });
  logActivity(access!, req, {
    action: "delete",
    module: "access",
    schoolId,
    entityId: id,
    entityLabel: role.name,
    summary: "Deleted role",
  });

  return NextResponse.json({ success: true });
}