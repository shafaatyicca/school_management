import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { SchoolModel } from "@/models/School";
import { RoleModel, ensureDefaultRoles } from "@/models/Role";
import { ActivityLogModel, LOG_RETENTION_MONTHS } from "@/models/ActivityLog";
import {
  FULL_ACCESS_ROLES,
  EMPTY_PERMISSIONS,
  fullPermissions,
  normalizePermissions,
  can as canPerm,
  canWidget as canWidgetPerm,
  canSpecial as canSpecialPerm,
  type Permissions,
  type ModuleKey,
  type WidgetKey,
  type Action,
  type SpecialKey,
} from "@/lib/permissions";

export type Access = {
  userId: string;
  userName: string;
  role: string;
  schoolId: string | null;
  isSuperAdmin: boolean;
  isSchoolAdmin: boolean;
  permissions: Permissions;
  can: (module: ModuleKey, action?: Action) => boolean;
  canWidget: (key: WidgetKey) => boolean;
  canSpecial: (key: SpecialKey) => boolean;
};

// Every module + action + widget switched on (Super Admin)
const FULL_PERMISSIONS: Permissions = fullPermissions();

// ── Small in-memory cache (60s) so permissions are fresh but not slow ──
const TTL = 60 * 1000;
const cache = new Map<string, { at: number; value: Access | null }>();

// Call after changing a user's role / permissions / active status
export function clearAccessCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

async function resolvePermissions(user: any): Promise<Permissions> {
  if (FULL_ACCESS_ROLES.includes(user.role)) return FULL_PERMISSIONS;

  const schoolId = user.schoolId ? String(user.schoolId) : null;
  if (!schoolId) {
    return user.useCustomPermissions && user.customPermissions
      ? normalizePermissions(user.customPermissions, user.role)
      : EMPTY_PERMISSIONS;
  }

  await ensureDefaultRoles(schoolId);
  // Only roles of the user's OWN school
  const role: any = user.roleId
    ? await (RoleModel as any).findOne({ _id: user.roleId, schoolId }).lean()
    : null;
  const roleDoc: any =
    role || (await (RoleModel as any).findOne({ schoolId, key: user.role }).lean()); // old users: role name only

  // Custom access for this user (widgets fall back to the role's template)
  if (user.useCustomPermissions && user.customPermissions) {
    return normalizePermissions(user.customPermissions, roleDoc?.key || user.role);
  }

  return roleDoc ? normalizePermissions(roleDoc.permissions, roleDoc.key) : EMPTY_PERMISSIONS;
}

/** Who is calling, and what may they do? null = not logged in / blocked */
export async function getAccess(): Promise<Access | null> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return null;

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  await connectDB();
  const user: any = await (UserModel as any)
    .findById(userId)
    .select("name role roleId useCustomPermissions customPermissions isActive schoolId")
    .lean();

  let value: Access | null = null;

  if (user && user.isActive !== false) {
    const isSuperAdmin = user.role === "super_admin";
    const schoolId = user.schoolId ? String(user.schoolId) : null;

    // School suspended / expired → staff blocked immediately (not only at login).
    // The Super Admin is never blocked, so they can open any school.
    let schoolOk = true;
    if (!isSuperAdmin && schoolId) {
      const school: any = await (SchoolModel as any).findById(schoolId).select("status").lean();
      schoolOk = !!school && school.status !== "inactive";
    }

    if (schoolOk) {
      const permissions = await resolvePermissions(user);
      value = {
        userId,
        userName: user.name || "",
        role: user.role,
        schoolId,
        isSuperAdmin,
        isSchoolAdmin: user.role === "school_admin",
        permissions,
        can: (module, action = "view") => isSuperAdmin || canPerm(permissions, module, action),
        canWidget: (key) => isSuperAdmin || canWidgetPerm(permissions, key),
        canSpecial: (key) => canSpecialPerm(permissions, key),
      };
    }
  }

  cache.set(userId, { at: Date.now(), value });
  return value;
}

/** Super Admin may pick a school; everyone else always works in their own */
export function schoolIdFor(access: Access, requested?: string | null) {
  return access.isSuperAdmin ? requested || null : access.schoolId;
}

const deny = (status: 401 | 403, message: string) =>
  NextResponse.json({ message }, { status });

/**
 * Use at the top of an API:
 *   const { access, error } = await requirePermission("fees", "edit");
 *   if (error) return error;
 */
export async function requirePermission(module: ModuleKey, action: Action = "view") {
  const access = await getAccess();
  if (!access) return { access: null, error: deny(401, "Unauthorized") };
  if (!access.can(module, action))
    return { access, error: deny(403, "You don't have permission for this action") };
  return { access, error: null };
}

export async function requireSpecial(key: SpecialKey) {
  const access = await getAccess();
  if (!access) return { access: null, error: deny(401, "Unauthorized") };
  if (!access.canSpecial(key))
    return { access, error: deny(403, "You don't have permission for this action") };
  return { access, error: null };
}

// ─────────────────────────────────────────────────────────────
// Activity logs
// ─────────────────────────────────────────────────────────────

type LogEntry = {
  action: "create" | "update" | "delete" | "view" | "export" | "print" | "payment" | "reverse";
  module: string;
  schoolId?: string | null; // defaults to the user's school
  entityId?: any;
  entityLabel?: string;
  summary?: string;
  changes?: { field: string; from: any; to: any }[];
};

/**
 * Writes a log row in the background (never slows down or breaks the API).
 *   logActivity(access, req, { action: "update", module: "students", entityLabel: "Ali (GR 5)", changes })
 */
export function logActivity(access: Access, req: Request | null, entry: LogEntry) {
  const expireAt = new Date();
  expireAt.setMonth(expireAt.getMonth() + LOG_RETENTION_MONTHS);

  const ip =
    req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req?.headers.get("x-real-ip") ||
    "";

  (ActivityLogModel as any)
    .create({
      schoolId: entry.schoolId !== undefined ? entry.schoolId : access.schoolId,
      userId: access.userId,
      userName: access.userName,
      userRole: access.role,
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId ? String(entry.entityId) : null,
      entityLabel: entry.entityLabel || "",
      summary: entry.summary || "",
      changes: entry.changes || [],
      ip,
      userAgent: req?.headers.get("user-agent") || "",
      expireAt,
    })
    .catch((e: any) => console.error("Activity log failed:", e?.message));
}

// Fields never shown in "what changed"
const SKIP_FIELDS = new Set(["_id", "__v", "createdAt", "updatedAt", "password", "schoolId"]);

const asComparable = (v: any) => {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v._id) return String(v._id); // populated ref
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Only the fields that really changed (top-level), old → new */
export function diffChanges(before: any, after: any, only?: string[]) {
  const keys = only || Object.keys({ ...before, ...after });
  if (!before || !after) return [];
  const out: { field: string; from: any; to: any }[] = [];
  for (const k of keys) {
    if (SKIP_FIELDS.has(k)) continue;
    const a = asComparable(before[k]);
    const b = asComparable(after[k]);
    if (a !== b) out.push({ field: k, from: before[k] ?? null, to: after[k] ?? null });
  }
  return out;
}