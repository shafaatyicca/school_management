import { toYMD } from "@/lib/pkTime";

export type Tone = "success" | "warning" | "danger" | "muted";

export const TONE_TEXT: Record<Tone, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  muted: "text-slate-400",
};

const EXPIRING_DAYS = 15;

// Expiry → "Till 30 Jun 2027" (green) / "6 days left" (amber) / "Expired 12 Nov 2026" (red)
export function expiryInfo(expiryDate?: any): { days: number | null; label: string; tone: Tone } {
  if (!expiryDate) return { days: null, label: "No expiry set", tone: "muted" };

  const days = Math.round((Date.parse(toYMD(expiryDate)) - Date.parse(toYMD())) / 86400000);
  const date = new Date(expiryDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

  if (days < 0) return { days, label: `Expired ${date}`, tone: "danger" };
  if (days === 0) return { days, label: "Expires today", tone: "warning" };
  if (days <= EXPIRING_DAYS) return { days, label: `${days} day${days > 1 ? "s" : ""} left`, tone: "warning" };
  return { days, label: `Till ${date}`, tone: "success" };
}

// Active school that expires within the next 15 days
export const isExpiring = (s: any) => {
  const { days } = expiryInfo(s?.expiryDate);
  return s?.status === "active" && days !== null && days >= 0 && days <= EXPIRING_DAYS;
};