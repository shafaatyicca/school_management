import mongoose, { Schema, Document } from "mongoose";
import { DEFAULT_ROLES, type Permissions } from "@/lib/permissions";

// Roles belong to ONE school (managed only by the Super Admin)
export interface IRole extends Document {
  schoolId: string;
  key: string; // "accountant", "cashier", "helpdesk", or a custom key
  name: string;
  isSystem: boolean; // created from a default template
  permissions: Permissions;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    schoolId: { type: String, required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    isSystem: { type: Boolean, default: false },
    permissions: {
      type: Schema.Types.Mixed,
      default: () => ({ modules: {}, special: {} }),
    },
  },
  { timestamps: true, minimize: false },
);


// Same key may exist in different schools, never twice in one school
RoleSchema.index({ schoolId: 1, key: 1 }, { unique: true });

export const RoleModel =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

// Creates the defalt roles for a school once (safe to call many times)
const checkedSchools = new Set<string>();
export async function ensureDefaultRoles(schoolId: string | null | undefined) {
  if (!schoolId) return;
  const sid = String(schoolId);
  if (checkedSchools.has(sid)) return;
  await Promise.all(
    DEFAULT_ROLES.map((r) =>
      (RoleModel as any).updateOne(
        { schoolId: sid, key: r.key },
        {
          $setOnInsert: {
            schoolId: sid,
            key: r.key,
            name: r.name,
            isSystem: true,
            permissions: r.permissions,
          },
        },
        { upsert: true },
      ),
    ),
  );
  checkedSchools.add(sid);
}