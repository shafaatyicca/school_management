import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolSettingModel } from "@/models/SchoolSetting";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { getSchoolSettings, MAX_VOUCHER_ITEMS } from "@/lib/schoolSettings";
import { getAccess, requirePermission, schoolIdFor, logActivity } from "@/lib/access";
import { pkToday } from "@/lib/pkTime";

// Settings shown in the activity log (path → readable name)
const LOG_FIELDS: [string, string][] = [
  ["phone", "Phone"],
  ["voucher.prefix", "Voucher prefix"],
  ["voucher.copies", "Voucher copies"],
  ["voucher.dueDay", "Due day"],
  ["voucher.validityDays", "Validity days"],
  ["voucher.note", "Voucher note"],
  ["voucher.maxItems", "Max items on voucher"],
  ["lateFee.mode", "Late fee mode"],
  ["lateFee.value", "Late fee value"],
  ["lateFee.autoApply", "Late fee auto apply"],
  ["lateFee.categoryId", "Late fee category"],
  ["lateFee.startMonth", "Late fee start month"],
  ["lateFee.startYear", "Late fee start year"],
  ["bank.name", "Bank name"],
  ["bank.accountTitle", "Bank account title"],
  ["bank.accountNumber", "Bank account number"],
  ["admission.undertaking", "Admission undertaking"],
  ["admission.formStyle", "Admission form style"],
];

// "voucher.dueDay" → obj.voucher.dueDay
const read = (obj: any, path: string) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
const asText = (v: any) => (v === null || v === undefined ? "" : String(v));

// GET → this school's settings (any logged-in user — vouchers and the admission form need them)
export async function GET(req: Request) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const schoolId = schoolIdFor(access, new URL(req.url).searchParams.get("schoolId"));
    if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });

    return NextResponse.json(await getSchoolSettings(schoolId));
  } catch (error: any) {
    console.error("Settings GET error:", error?.message);
    return NextResponse.json({ message: "Failed to load settings" }, { status: 500 });
  }
}

// PUT → save settings (created if they don't exist) — Settings → Edit
export async function PUT(req: Request) {
  try {
    const { access, error } = await requirePermission("settings", "edit");
    if (error) return error;

    await connectDB();
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

    const schoolId = schoolIdFor(access!, body.schoolId);
    if (!schoolId) return NextResponse.json({ message: "School ID missing" }, { status: 400 });

    const v = body.voucher || {};
    const lf = body.lateFee || {};
    const b = body.bank || {};
    const ad = body.admission || {};

    // Fine category must be of this school
    let categoryId = lf.categoryId || null;
    if (categoryId) {
      const ok = await (FeeCategoryModel as any).exists({ _id: categoryId, schoolId }).catch(() => null);
      if (!ok) categoryId = null;
    }
    if (lf.autoApply && !categoryId) {
      return NextResponse.json({ message: "Select the fine category to apply a late fee." }, { status: 400 });
    }

    // Apply from: this month if not given
    const today = pkToday(); // this month in Pakistan
    const startMonth =
      Number(lf.startMonth) >= 1 && Number(lf.startMonth) <= 12 ? Number(lf.startMonth) : today.m;
    const startYear = Number(lf.startYear) >= 2000 ? Number(lf.startYear) : today.y;

    const clean = {
      phone: String(body.phone || "").trim(),
      voucher: {
        prefix: String(v.prefix || "").trim().toUpperCase(),
        copies: [1, 2, 3].includes(Number(v.copies)) ? Number(v.copies) : 1,
        dueDay: Math.min(28, Math.max(1, Number(v.dueDay) || 10)),
        validityDays: Math.max(0, Number(v.validityDays) || 0),
        note: String(v.note || ""),
        maxItems: Math.min(MAX_VOUCHER_ITEMS, Math.max(1, Number(v.maxItems) || 10)),
      },
      lateFee: {
        mode: lf.mode === "percentage" ? "percentage" : "fixed",
        value: Math.max(0, Number(lf.value) || 0),
        autoApply: Boolean(lf.autoApply),
        categoryId,
        startMonth,
        startYear,
      },
      bank: {
        name: String(b.name || "").trim(),
        accountTitle: String(b.accountTitle || "").trim(),
        accountNumber: String(b.accountNumber || "").trim(),
      },
      admission: {
        undertaking: String(ad.undertaking || "").trim().slice(0, 1500),
        formStyle: ad.formStyle === "style2" ? "style2" : "style1",
      },
    };


    // Old values (for the log) — and was it ever saved before?
    const [before, existed]: any[] = await Promise.all([
      getSchoolSettings(schoolId),
      (SchoolSettingModel as any).exists({ schoolId }),
    ]);

    await (SchoolSettingModel as any).findOneAndUpdate(
      { schoolId },
      { $set: { ...clean, schoolId } },
      { upsert: true, new: true, runValidators: true },
    );

    const after: any = await getSchoolSettings(schoolId);

    // What changed
    const changes = LOG_FIELDS.filter(([path]) => asText(read(before, path)) !== asText(read(after, path))).map(
      ([path, label]) => ({ field: label, from: read(before, path) ?? "", to: read(after, path) ?? "" }),
    );

    if (changes.length || !existed) {
      logActivity(access!, req, {
        action: existed ? "update" : "create",
        module: "settings",
        schoolId: String(schoolId),
        entityLabel: "School settings",
        summary: existed ? `Updated ${changes.length} setting(s)` : "Created school settings",
        changes,
      });
    }

    return NextResponse.json(after);
  } catch (error: any) {
    console.error("Settings PUT error:", error?.message);
    return NextResponse.json({ message: "Failed to save settings" }, { status: 500 });
  }
}