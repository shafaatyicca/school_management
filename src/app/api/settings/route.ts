import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SchoolSettingModel } from "@/models/SchoolSetting";
import { FeeCategoryModel } from "@/models/FeeCategory";
import { getSchoolSettings, MAX_VOUCHER_ITEMS } from "@/lib/schoolSettings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const resolveSchoolId = (session: any, fromRequest: string | null) =>
  session?.user?.role === "super_admin" ? fromRequest : session?.user?.schoolId;

// GET → school ki settings
export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const schoolId = resolveSchoolId(
      session,
      new URL(req.url).searchParams.get("schoolId"),
    );
    if (!schoolId)
      return NextResponse.json({ message: "School ID missing" }, { status: 400 });

    return NextResponse.json(await getSchoolSettings(schoolId));
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PUT → settings save (na hon to ban jayengi)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const schoolId = resolveSchoolId(session, body.schoolId);
    if (!schoolId)
      return NextResponse.json({ message: "School ID missing" }, { status: 400 });

    const v = body.voucher || {};
    const lf = body.lateFee || {};
    const b = body.bank || {};
    const ad = body.admission || {};

    // Fine category isi school ki honi chahiye
    let categoryId = lf.categoryId || null;
    if (categoryId) {
      const ok = await FeeCategoryModel.exists({ _id: categoryId, schoolId } as any);
      if (!ok) categoryId = null;
    }
    if (lf.autoApply && !categoryId) {
      return NextResponse.json(
        { message: "Select the fine category to apply a late fee." },
        { status: 400 },
      );
    }

    // Apply from: na diya ho to is mahine se
    const now = new Date();
    const startMonth =
      Number(lf.startMonth) >= 1 && Number(lf.startMonth) <= 12
        ? Number(lf.startMonth)
        : now.getMonth() + 1;
    const startYear =
      Number(lf.startYear) >= 2000 ? Number(lf.startYear) : now.getFullYear();

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

    await SchoolSettingModel.findOneAndUpdate(
      { schoolId } as any,
      { $set: { ...clean, schoolId } },
      { upsert: true, new: true, runValidators: true },
    );

    return NextResponse.json(await getSchoolSettings(schoolId));
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}