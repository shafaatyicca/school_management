// ─────────────────────────────────────────────────────────────
// Everything that belongs to a STUDENT or a SCHOOL — in one place.
// New module (Attendance, Exams, Results ...):
//   • linked to a student → add ONE entry to STUDENT_LINKS
//   • has a schoolId      → add ONE entry to SCHOOL_LINKS
// ─────────────────────────────────────────────────────────────
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary-server";
import Student from "@/models/Student";
import { ParentModel } from "@/models/Parent";
import Employee from "@/models/Employee";
import { ClassModel } from "@/models/Class";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { FeeDiscount } from "@/models/FeeDiscount";
import { StudentFeeInvoice } from "@/models/StudentFeeInvoice";
import { SchoolSettingModel } from "@/models/SchoolSetting";
import Todo from "@/models/Todo";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";
import { ImportBatch } from "@/models/ImportBatch";
import { DashboardLayoutModel } from "@/models/DashboardLayout";
import { ActivityLogModel } from "@/models/ActivityLog";
import { GlobalCounterModel } from "@/models/GlobalCounter";

// ═════════════════════════════════════════════════════════════
// STUDENT
//   blockIf → records that already "happened" (payments, marks, attendance).
//             If any exist, the student can't be deleted (mark Inactive instead).
//   action  → "delete" = remove those records, "pull" = remove the id from a list
// ═════════════════════════════════════════════════════════════
type StudentLink = {
  label: string; // shown in the confirm dialog / log
  model: any;
  field: string; // field that holds the student id
  action: "delete" | "pull";
  blockIf?: Record<string, any>; // extra filter: any match → delete not allowed
  blockMessage?: string; // "fee payments"
  silent?: boolean; // don't show in the confirm dialog
};

export const STUDENT_LINKS: StudentLink[] = [
  {
    label: "unpaid invoice(s)",
    model: StudentFeeInvoice,
    field: "studentId",
    action: "delete",
    // Any payment (even a reversed one) = real money record → keep the student
    blockIf: {
      $or: [
        { paidAmount: { $gt: 0 } },
        { "paymentHistory.0": { $exists: true } },
        { "reversedPayments.0": { $exists: true } },
      ],
    },
    blockMessage: "fee payments",
  },
  {
    label: "discount record(s)",
    model: FeeDiscount,
    field: "studentId",
    action: "delete",
  },
  {
    label: "import record(s)",
    model: ImportBatch,
    field: "studentIds",
    action: "pull", // keep the import history, just drop this student from it
    silent: true,
  },
  // (Later) Attendance, Exam results ... → add here with blockIf
];

const oid = (id: string) => new mongoose.Types.ObjectId(String(id));

// What would happen if this student is deleted?
export async function checkStudentDelete(studentId: string) {
  const sid = oid(studentId);
  const blockers: string[] = [];
  const willDelete: { label: string; count: number }[] = [];

  for (const l of STUDENT_LINKS) {
    const base = { [l.field]: sid };
    if (l.blockIf && (await l.model.exists({ ...base, ...l.blockIf }))) {
      blockers.push(l.blockMessage || l.label);
    }
    if (l.action === "delete" && !l.silent) {
      const count = await l.model.countDocuments(base);
      if (count) willDelete.push({ label: l.label, count });
    }
  }
  return { blockers, willDelete };
}

// Remove everything linked to the student (call only after checkStudentDelete has no blockers)
export async function deleteStudentLinks(studentId: string) {
  const sid = oid(studentId);
  for (const l of STUDENT_LINKS) {
    if (l.action === "delete") {
      await l.model.deleteMany({ [l.field]: sid });
    } else {
      await l.model.updateMany({ [l.field]: sid }, { $pull: { [l.field]: sid } });
    }
  }
}

// ═════════════════════════════════════════════════════════════
// SCHOOL — everything removed when a school is deleted.
// NOT here (kept on purpose): SchoolInvoice (Super Admin's own billing), Plan.
// ═════════════════════════════════════════════════════════════
type SchoolLink = {
  label: string;
  model: any;
  extra?: Record<string, any>; // extra filter (e.g. never the Super Admin)
  backup?: boolean; // included in the download
  imageField?: string; // Cloudinary images to remove
};

export const SCHOOL_LINKS: SchoolLink[] = [
  { label: "Students", model: Student, backup: true, imageField: "image" },
  { label: "Parents", model: ParentModel, backup: true },
  { label: "Employees", model: Employee, backup: true, imageField: "image" },
  { label: "Classes", model: ClassModel, backup: true },
  { label: "Fee categories", model: FeeCategoryModel, backup: true },
  { label: "Discounts", model: FeeDiscount, backup: true },
  { label: "Invoices", model: StudentFeeInvoice, backup: true },
  { label: "Settings", model: SchoolSettingModel, backup: true },
  { label: "Tasks", model: Todo, backup: true },
  { label: "Roles", model: RoleModel, backup: true },
  {
    label: "Users",
    model: UserModel,
    extra: { role: { $ne: "super_admin" } }, // the Super Admin is never removed
    backup: true,
    imageField: "image",
  },
  { label: "Import history", model: ImportBatch, backup: true },
  { label: "Dashboard layouts", model: DashboardLayoutModel },
  { label: "Activity logs", model: ActivityLogModel },
  // (Later) Attendance, Exams, Results ... → add here
];

// Some models keep schoolId as text, some as ObjectId → match both
export function schoolFilter(schoolId: string) {
  const sid = String(schoolId);
  const ids: any[] = [sid];
  if (mongoose.Types.ObjectId.isValid(sid)) ids.push(new mongoose.Types.ObjectId(sid));
  return { schoolId: { $in: ids } };
}

// Never put secrets in the backup file
const SECRET_FIELDS = ["password", "plainPassword", "securityQuestion"];
const clean = (doc: any) => {
  const out = { ...doc };
  for (const f of SECRET_FIELDS) delete out[f];
  return out;
};

// "…/upload/v123/school_management/x/students/abc.webp" → "school_management/x/students/abc"
const publicIdOf = (url: string) => {
  try {
    return decodeURIComponent(url)
      .split("/upload/")[1]
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");
  } catch {
    return "";
  }
};

// How many records of each kind (shown before deleting)
export async function countSchoolData(schoolId: string) {
  const base = schoolFilter(schoolId);
  const counts: { label: string; count: number }[] = [];
  for (const l of SCHOOL_LINKS) {
    const count = await l.model.collection.countDocuments({ ...base, ...(l.extra || {}) });
    if (count) counts.push({ label: l.label, count });
  }
  return counts;
}

// Everything of the school as plain data (for the download)
export async function backupSchoolData(schoolId: string) {
  const base = schoolFilter(schoolId);
  const data: Record<string, any[]> = {};
  for (const l of SCHOOL_LINKS) {
    if (!l.backup) continue;
    const docs = await l.model.collection.find({ ...base, ...(l.extra || {}) }).toArray();
    data[l.label] = docs.map(clean);
  }
  return data;
}

// Removes ALL data of the school (the school record itself is removed by the caller)
export async function deleteSchoolData(schoolId: string) {
  const base = schoolFilter(schoolId);

  // 1. Collect Cloudinary images first (they are gone once the records are deleted)
  const publicIds: string[] = [];
  for (const l of SCHOOL_LINKS) {
    if (!l.imageField) continue;
    const docs = await l.model.collection
      .find({ ...base, ...(l.extra || {}) }, { projection: { [l.imageField]: 1 } })
      .toArray();
    for (const d of docs) {
      const url = String(d?.[l.imageField] || "");
      if (url.includes("cloudinary")) {
        const pid = publicIdOf(url);
        if (pid) publicIds.push(pid);
      }
    }
  }

  // 2. Records
  const deleted: { label: string; count: number }[] = [];
  for (const l of SCHOOL_LINKS) {
    const r = await l.model.collection.deleteMany({ ...base, ...(l.extra || {}) });
    if (r?.deletedCount) deleted.push({ label: l.label, count: r.deletedCount });
  }

  // 3. Receipt / number counters of this school ("payment_<schoolId>" ...)
  const sid = String(schoolId).replace(/[^a-fA-F0-9]/g, "");
  if (sid) {
    await GlobalCounterModel.collection.deleteMany({ id: { $regex: `_${sid}$` } });
  }

  // 4. Images — 100 per call; a failure here never stops the delete
  let imagesRemoved = 0;
  for (let i = 0; i < publicIds.length; i += 100) {
    try {
      await cloudinary.api.delete_resources(publicIds.slice(i, i + 100));
      imagesRemoved += Math.min(100, publicIds.length - i);
    } catch (err: any) {
      console.error("Cloudinary bulk delete failed:", err?.message);
    }
  }

  return { deleted, imagesRemoved };
}