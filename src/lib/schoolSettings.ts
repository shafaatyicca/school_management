import { SchoolSettingModel } from "@/models/SchoolSetting";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";

// Re-export date helpers so existing imports (lateFine.ts etc.) keep working
export { billingDueDate, lateFeeAmount, computeVoucherDates, DEFAULT_UNDERTAKING, } from "@/lib/voucherDates";

export const MAX_VOUCHER_ITEMS = 15; // Keeps the voucher within a single printed page

export const DEFAULT_SETTINGS = {
  phone: "",
  voucher: { prefix: "", copies: 1, dueDay: 10, validityDays: 0, note: "", maxItems: 10 },
  lateFee: {
    mode: "fixed",
    value: 0,
    autoApply: false,
    categoryId: null as any,
    startMonth: null as number | null,
    startYear: null as number | null,
  },
  bank: { name: "", accountTitle: "", accountNumber: "" },
    admission: { undertaking: DEFAULT_UNDERTAKING, formStyle: "style1" },
};

// School settings (falls back to defaults)
export async function getSchoolSettings(schoolId: any) {
  const doc: any = await SchoolSettingModel.findOne({ schoolId } as any).lean();
  return {
    phone: doc?.phone ?? DEFAULT_SETTINGS.phone,
    voucher: { ...DEFAULT_SETTINGS.voucher, ...(doc?.voucher || {}) },
    lateFee: { ...DEFAULT_SETTINGS.lateFee, ...(doc?.lateFee || {}) },
    bank: { ...DEFAULT_SETTINGS.bank, ...(doc?.bank || {}) },
    admission: {
      undertaking: doc?.admission?.undertaking?.trim() || DEFAULT_UNDERTAKING,
      formStyle: doc?.admission?.formStyle === "style2" ? "style2" : "style1",
    },
  };
}