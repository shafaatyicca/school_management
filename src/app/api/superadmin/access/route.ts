import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { RoleModel, ensureDefaultRoles } from "@/models/Role";
import { getAccess, clearAccessCache, logActivity } from "@/lib/access";
import {
  sanitizePermissions,
  normalizePermissions,
  describePermissionChanges,
  EMPTY_PERMISSIONS,
} from "@/lib/permissions";

// Roles whose key is stored directly in user.role (custom roles are stored as "staff")
const DEFAULT_KEYS = ["school_admin", "accountant", "cashier", "helpdesk"];
const USER_FIELDS =
  "name email role roleId useCustomPermissions customPermissions isActive lastLoginAt image managedBy";

async function superAdminOnly() {
  const access = await getAccess();
  if (!access) return { access: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  if (!access.isSuperAdmin)
    return { access, error: NextResponse.json({ message: "Only Super Admin" }, { status: 403 }) };
  return { access, error: null };
}

// The role a user currently has inside their school (roleId, or old users: role name)
async function currentRole(user: any, schoolId: string) {
  if (user.roleId) {
    const r = await (RoleModel as any).findOne({ _id: user.roleId, schoolId }).lean();
    if (r) return r;
  }
  return (RoleModel as any).findOne({ schoolId, key: user.role }).lean();
}

// The permissions a user effectively has (for the log "before / after")
const effectiveOf = (useCustom: boolean, custom: any, roleDoc: any, fallbackKey?: string) =>
  useCustom && custom
    ? normalizePermissions(custom, roleDoc?.key || fallbackKey)
    : roleDoc
      ? normalizePermissions(roleDoc.permissions, roleDoc.key)
      : EMPTY_PERMISSIONS;

// GET ?schoolId=… → users of that school + that school's roles
export async function GET(req: Request) {
  const { error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const schoolId = new URL(req.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });

  await ensureDefaultRoles(schoolId);
  const [users, roles]: [any[], any[]] = await Promise.all([
    (UserModel as any)
      .find({ schoolId, role: { $ne: "super_admin" } })
      .select(USER_FIELDS)
      .sort({ name: 1 })
      .lean(),
    (RoleModel as any).find({ schoolId }).sort({ isSystem: -1, name: 1 }).lean(),
  ]);

  // Old data without widgets → template widgets (what they really have)
  const byId = new Map(roles.map((r) => [String(r._id), r]));
  const byKey = new Map(roles.map((r) => [r.key, r]));

  const outRoles = roles.map((r) => ({
    ...r,
    permissions: normalizePermissions(r.permissions, r.key),
  }));

  const outUsers = users.map((u) => {
    if (!u.customPermissions) return u;
    const roleDoc = (u.roleId && byId.get(String(u.roleId))) || byKey.get(u.role);
    return {
      ...u,
      customPermissions: normalizePermissions(u.customPermissions, roleDoc?.key || u.role),
    };
  });

  return NextResponse.json({ users: outUsers, roles: outRoles });
}

// PUT → { schoolId, userId, access: roleId (or "school_admin"), isActive, useCustomPermissions, customPermissions }
export async function PUT(req: Request) {
  const { access, error } = await superAdminOnly();
  if (error) return error;

  await connectDB();
  const body = await req.json();
  const { schoolId, userId } = body;
  if (!schoolId || !userId)
    return NextResponse.json({ message: "School and user are required" }, { status: 400 });

  const user: any = await (UserModel as any).findOne({ _id: userId, schoolId }).lean();
  if (!user) return NextResponse.json({ message: "User not found in this school" }, { status: 404 });
  if (user.role === "super_admin")
    return NextResponse.json({ message: "Super Admin access cannot be changed here" }, { status: 400 });

  // Make sure this school's default roles (incl. School Admin) exist
  await ensureDefaultRoles(schoolId);
  const oldRole = await currentRole(user, schoolId);

  // ── New role (must belong to this school). Old pages may still send "school_admin".
  const newRole: any =
    body.access === "school_admin"
      ? await (RoleModel as any).findOne({ schoolId, key: "school_admin" }).lean()
      : await (RoleModel as any).findOne({ _id: body.access, schoolId }).lean();
  if (!newRole)
    return NextResponse.json({ message: "Please choose a valid role" }, { status: 400 });

  // ── Role, active, custom permissions (works for every role, School Admin included)
  const update: any = {
    roleId: newRole._id,
    role: DEFAULT_KEYS.includes(newRole.key) ? newRole.key : "staff",
    isActive: body.isActive !== false,
    useCustomPermissions: !!body.useCustomPermissions,
  };
  update.customPermissions = update.useCustomPermissions
    ? sanitizePermissions(body.customPermissions)
    : null;

  await (UserModel as any).updateOne({ _id: userId }, { $set: update });
  clearAccessCache(String(userId)); // applies immediately

  // ── Log: role name, active, custom, and exactly which permissions changed
  const oldName = oldRole?.name || user.role;
  const newName = newRole.name;

  const changes: any[] = [];
  if (oldName !== newName) changes.push({ field: "Role", from: oldName, to: newName });
  if ((user.isActive !== false) !== update.isActive)
    changes.push({
      field: "Login active",
      from: user.isActive !== false ? "Yes" : "No",
      to: update.isActive ? "Yes" : "No",
    });
  if (!!user.useCustomPermissions !== update.useCustomPermissions)
    changes.push({
      field: "Custom access",
      from: user.useCustomPermissions ? "Yes" : "No",
      to: update.useCustomPermissions ? "Yes" : "No",
    });
  changes.push(
    ...describePermissionChanges(
      effectiveOf(!!user.useCustomPermissions, user.customPermissions, oldRole, user.role),
      effectiveOf(update.useCustomPermissions, update.customPermissions, newRole),
    ),
  );

  logActivity(access!, req, {
    action: "update",
    module: "access",
    schoolId,
    entityId: userId,
    entityLabel: `${user.name} (${user.email})`,
    summary: "Changed user access",
    changes,
  });

  
  const fresh: any = await (UserModel as any).findById(userId).select(USER_FIELDS).lean();
  if (fresh?.customPermissions) {
    fresh.customPermissions = normalizePermissions(fresh.customPermissions, newRole.key);
  }
  return NextResponse.json(fresh);
}