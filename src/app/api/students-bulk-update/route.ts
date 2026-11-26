import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import { ClassModel } from "@/models/Class";
import { ensureTuitionLock } from "@/lib/feeLock";
import { requirePermission, schoolIdFor, logActivity } from "@/lib/access";

const StudentM = Student as any; // avoids Mongoose union-type errors on Vercel
const ClassM = ClassModel as any;

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });
const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));
const YMD = /^\d{4}-\d{2}-\d{2}$/;

type Field = "dateOfBirth" | "enrollmentDate" | "classId" | "section" | "bFormNumber";
const FIELD_LABEL: Record<Field, string> = {
  dateOfBirth: "Date of Birth",
  enrollmentDate: "Admission Date",
  classId: "Class",
  section: "Section",
  bFormNumber: "B-Form Number",
};

// Fields the page needs (no passwords)
const LIST_FIELDS =
  "grNumber fullName classId section dateOfBirth enrollmentDate bFormNumber parentId motherPhone status";

const sectionNames = (cls: any): string[] =>
  (cls?.sections || []).map((s: any) => (typeof s === "string" ? s : s?.name)).filter(Boolean);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// B-Form: 13 digits → "12345-1234567-1"
const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
const fmtBForm = (d: string) => `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;

// Dates in Pakistan time
const ymdPk = (d: any) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }) : "");
const nice = (ymd: string) =>
  ymd
    ? new Date(`${ymd}T00:00:00+05:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      })
    : "—";

const listQuery = (filter: any) =>
  StudentM.find(filter)
    .select(LIST_FIELDS)
    .populate("classId", "name")
    .populate("parentId", "fullName phone");

// GET ?schoolId=&classIds=a,b&section=  → students of those classes
// GET ?schoolId=&q=ali                  → search by name or GR (max 20)
// GET ?schoolId=&ids=a,b                → picked students (search box)
// Only active students.
export async function GET(req: Request) {
  try {
    const { access, error } = await requirePermission("bulkInfo", "view");
    if (error || !access) return error ?? bad("Unauthorized", 401);

    await connectDB();
    const sp = new URL(req.url).searchParams;
    const schoolId = schoolIdFor(access, sp.get("schoolId"));
    if (!schoolId) return bad("School ID missing");

    const classIds = (sp.get("classIds") || "").split(",").filter(isOid);
    const section = (sp.get("section") || "").trim();
    const q = (sp.get("q") || "").trim();
    const ids = (sp.get("ids") || "").split(",").filter(isOid); // picked from the search box
    if (!classIds.length && !q && !ids.length) return NextResponse.json({ students: [] });

    const filter: any = { schoolId: String(schoolId), status: "active" };
    if (classIds.length) filter.classId = { $in: classIds };
    if (section) filter.section = section;
    if (ids.length) filter._id = { $in: ids };
    if (q) {
      const gr = Number(q);
      filter.$or = [
        { fullName: { $regex: escapeRegex(q), $options: "i" } },
        ...(Number.isFinite(gr) && gr > 0 ? [{ grNumber: gr }] : []),
      ];
    }

    const students = await listQuery(filter)
      .sort(q ? { fullName: 1 } : { grNumber: 1 })
      .limit(q ? 20 : 3000)
      .lean();

    return NextResponse.json({ students });
  } catch (e: any) {
    console.error("Bulk info GET error:", e?.message);
    return bad("Failed to load students", 500);
  }
}

// POST { schoolId, field, changes: [{ id, value, section? }] }
// All rows are checked first: if any row is wrong, nothing is saved.
export async function POST(req: Request) {
  try {
    const { access, error } = await requirePermission("bulkInfo", "edit");
    if (error || !access) return error ?? bad("Unauthorized", 401);

    await connectDB();
    const body = await req.json().catch(() => null);
    const schoolId = schoolIdFor(access, body?.schoolId);
    if (!schoolId) return bad("School ID missing");

    const field = body?.field as Field;
    if (!FIELD_LABEL[field]) return bad("Invalid field");

    const rows: any[] = (Array.isArray(body?.changes) ? body.changes : []).filter((r: any) => isOid(r?.id));
    if (!rows.length) return bad("No changes to save");
    if (rows.length > 3000) return bad("Too many students at once");

    // Only this school's students
    const students: any[] = await StudentM.find({
      _id: { $in: rows.map((r) => String(r.id)) },
      schoolId: String(schoolId),
    })
      .select("fullName grNumber classId section dateOfBirth enrollmentDate bFormNumber")
      .lean();
    const byId = new Map(students.map((s) => [String(s._id), s]));

    // This school's classes (section checks + names for the log)
    const classes: any[] = await ClassM.find({ schoolId: String(schoolId) }).select("name sections").lean();
    const classById = new Map(classes.map((c) => [String(c._id), c]));

    const today = ymdPk(new Date());
    const ops: any[] = [];
    const changes: { field: string; from: any; to: any }[] = [];
    const errors: string[] = [];
    const classMoved: string[] = [];
    const bForms: { id: any; who: string; digits: string }[] = []; // for the duplicate check
    const seenBForm = new Set<string>();

    for (const r of rows) {
      const s = byId.get(String(r.id));
      if (!s) continue;
      const who = `${s.fullName} (GR ${s.grNumber})`;

      if (field === "dateOfBirth" || field === "enrollmentDate") {
        const v = String(r.value || "");
        if (!YMD.test(v) || isNaN(new Date(v).getTime())) {
          errors.push(`${who}: invalid date`);
          continue;
        }
        if (v > today) {
          errors.push(`${who}: date can't be in the future`);
          continue;
        }
        const old = ymdPk(s[field]);
        if (old === v) continue;
        ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { [field]: new Date(v) } } } });
        changes.push({ field: who, from: nice(old), to: nice(v) });
      } else if (field === "section") {
        const v = String(r.value || "").trim();
        const cls = classById.get(String(s.classId));
        if (!v || !sectionNames(cls).includes(v)) {
          errors.push(`${who}: section "${v}" is not in ${cls?.name || "this class"}`);
          continue;
        }
        if (v === s.section) continue;
        ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { section: v } } } });
        changes.push({ field: who, from: s.section || "—", to: v });
      } else if (field === "bFormNumber") {
        const digits = onlyDigits(r.value);
        if (digits.length !== 13) {
          errors.push(`${who}: B-Form must be 13 digits`);
          continue;
        }
        if (onlyDigits(s.bFormNumber) === digits) continue;
        if (seenBForm.has(digits)) {
          errors.push(`${who}: the same B-Form is entered for another student`);
          continue;
        }
        seenBForm.add(digits);
        const v = fmtBForm(digits);
        bForms.push({ id: s._id, who, digits });
        ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { bFormNumber: v } } } });
        changes.push({ field: who, from: s.bFormNumber || "—", to: v });
      } else {
        // classId (+ section of the new class)
        const cid = String(r.value || "");
        const sec = String(r.section || "").trim();
        const cls = classById.get(cid);
        if (!cls) {
          errors.push(`${who}: class not found`);
          continue;
        }
        if (!sec || !sectionNames(cls).includes(sec)) {
          errors.push(`${who}: choose a section of ${cls.name}`);
          continue;
        }
        if (cid === String(s.classId) && sec === s.section) continue;
        const oldCls = classById.get(String(s.classId));
        ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { classId: cid, section: sec } } } });
        changes.push({
          field: who,
          from: `${oldCls?.name || "—"} (${s.section || ""})`,
          to: `${cls.name} (${sec})`,
        });
        if (cid !== String(s.classId)) classMoved.push(String(s._id));
      }
    }

    // B-Form already used by another student of this school?
    if (bForms.length) {
      const variants = bForms.flatMap((b) => [b.digits, fmtBForm(b.digits)]);
      const taken: any[] = await StudentM.find({
        schoolId: String(schoolId),
        bFormNumber: { $in: variants },
        _id: { $nin: bForms.map((b) => b.id) },
      })
        .select("fullName grNumber bFormNumber")
        .lean();
      for (const t of taken) {
        const b = bForms.find((x) => x.digits === onlyDigits(t.bFormNumber));
        if (b) errors.push(`${b.who}: B-Form already belongs to ${t.fullName} (GR ${t.grNumber})`);
      }
    }

    if (errors.length) {
      return NextResponse.json(
        {
          message: errors.length === 1 ? errors[0] : `${errors.length} rows have problems. Nothing was saved.`,
          errors,
        },
        { status: 400 },
      );
    }
    if (!ops.length) return bad("Nothing changed");

    // Class move: lock the tuition at the OLD class fee first (if not locked yet)
    for (const id of classMoved) {
      try {
        await ensureTuitionLock(id);
      } catch (e: any) {
        console.error("Tuition lock (before) failed:", e?.message);
      }
    }

    await StudentM.bulkWrite(ops);

    // …then move the base to the new class fee: net fee stays, the discount adjusts
    for (const id of classMoved) {
      try {
        await ensureTuitionLock(id);
      } catch (e: any) {
        console.error("Tuition lock (after) failed:", e?.message);
      }
    }

    // ONE log for the whole save, one detail line per student
    logActivity(access, req, {
      action: "update",
      module: "students",
      schoolId: String(schoolId),
      entityLabel: `${ops.length} student(s)`,
      summary: `Bulk change · ${FIELD_LABEL[field]} of ${ops.length} student(s)`,
      changes,
    });

    const updated = await listQuery({ _id: { $in: rows.map((r) => String(r.id)) }, schoolId: String(schoolId) }).lean();
    return NextResponse.json({ success: true, updated: ops.length, students: updated });
  } catch (e: any) {
    console.error("Bulk info POST error:", e?.message);
    return bad("Failed to save changes", 500);
  }
}