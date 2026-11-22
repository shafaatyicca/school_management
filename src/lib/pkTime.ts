export const PK_TZ = "Asia/Karachi";
const PK_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type YMD = { y: number; m: number; d: number }; // m = 1–12

const pad = (n: number) => String(n).padStart(2, "0");

// ── Reading "which Pakistan day is it" ───────────────────────

/** Pakistan year / month (1–12) / day / weekday (0 = Sunday) of any moment. Default: now. */
export function pkParts(date: Date | string | number = new Date()) {
  const p = new Date(new Date(date).getTime() + PK_OFFSET_MS);
  return {
    y: p.getUTCFullYear(),
    m: p.getUTCMonth() + 1,
    d: p.getUTCDate(),
    weekday: p.getUTCDay(),
  };
}

/** Today in Pakistan → { y, m, d } */
export const pkToday = (): YMD => {
  const { y, m, d } = pkParts();
  return { y, m, d };
};

/** "2026-11-22" (Pakistan day of a moment). Default: today. */
export function toYMD(date: Date | string | number = new Date()): string {
  const { y, m, d } = pkParts(date);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "2026-11-22" → { y: 2026, m: 11, d: 22 } (null if invalid) */
export function parseYMD(ymd: string): YMD | null {
  const r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(ymd || "").trim());
  if (!r) return null;
  const y = +r[1];
  const m = +r[2];
  const d = +r[3];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? { y, m, d } : null;
}

// ── Real moments (for database queries) ──────────────────────

/** The real moment of 12:00 AM in Pakistan for a date. Day / month overflow is fine (d = 0, m = 13…). */
export const pkMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d) - PK_OFFSET_MS);

/** 12:00 AM today (Pakistan) */
export function pkStartOfToday() {
  const { y, m, d } = pkToday();
  return pkMidnight(y, m, d);
}

/** 12:00 AM tomorrow (Pakistan) */
export function pkStartOfTomorrow() {
  const { y, m, d } = pkToday();
  return pkMidnight(y, m, d + 1);
}

/** 1st of a month, 12:00 AM (Pakistan). Default: this month. */
export function pkStartOfMonth(y?: number, m?: number) {
  const t = pkToday();
  return pkMidnight(y ?? t.y, m ?? t.m, 1);
}

/** 1st of the next month, 12:00 AM (Pakistan). Default: after this month. */
export function pkStartOfNextMonth(y?: number, m?: number) {
  const t = pkToday();
  return pkMidnight(y ?? t.y, (m ?? t.m) + 1, 1);
}

/** Whole Pakistan day for filters: { start, end } (end = next day's 12:00 AM, use $lt) */
export function pkDayRange(ymd: string) {
  const p = parseYMD(ymd);
  if (!p) return null;
  return { start: pkMidnight(p.y, p.m, p.d), end: pkMidnight(p.y, p.m, p.d + 1) };
}

/** From one Pakistan day to another, both included: { start, end } (use $gte start, $lt end) */
export function pkRange(fromYmd: string, toYmd: string) {
  const a = pkDayRange(fromYmd);
  const b = pkDayRange(toYmd);
  if (!a || !b || a.start > b.end) return null;
  return { start: a.start, end: b.end };
}

/** Is this moment before today in Pakistan? (e.g. "due date passed") */
export const isBeforePkToday = (date: Date | string | number) =>
  new Date(date).getTime() < pkStartOfToday().getTime();

// ── Date-only fields (date of birth, admission, due date…) ───

/**
 * Date-only value to SAVE: "2026-11-22" → 2026-11-22T00:00:00Z.
 * The day never shifts. Show it later with calendarDate().
 */
export function dateOnly(ymd: string): Date | null {
  const p = parseYMD(ymd);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null;
}

/** Add days to "YYYY-MM-DD" → "YYYY-MM-DD" */
export function addDaysYMD(ymd: string, days: number): string {
  const p = parseYMD(ymd);
  if (!p) return ymd;
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Days in a month (m = 1–12) */
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// ── Showing dates (same result on server and browser) ────────

const valid = (v: any) => v !== null && v !== undefined && v !== "" && !isNaN(new Date(v).getTime());

/** "22 Nov 2026" (Pakistan) — for createdAt, payment date… */
export const pkDate = (v: any, empty = "—") =>
  valid(v)
    ? new Date(v).toLocaleDateString("en-GB", { timeZone: PK_TZ, day: "2-digit", month: "short", year: "numeric" })
    : empty;

/** "04:52 PM" (Pakistan) */
export const pkTime = (v: any, empty = "—") =>
  valid(v)
    ? new Date(v).toLocaleTimeString("en-US", { timeZone: PK_TZ, hour: "2-digit", minute: "2-digit", hour12: true })
    : empty;

/** "22 Nov 2026, 04:52 PM" (Pakistan) */
export const pkDateTime = (v: any, empty = "—") => (valid(v) ? `${pkDate(v)}, ${pkTime(v)}` : empty);

/** "November 2026" (Pakistan) */
export const pkMonthYear = (v: any, empty = "—") =>
  valid(v) ? new Date(v).toLocaleDateString("en-GB", { timeZone: PK_TZ, month: "long", year: "numeric" }) : empty;

/** Date-only field (DOB, admission, due date) → "20 Jul 2016". Never shows a time, never shifts the day. */
export const calendarDate = (v: any, empty = "—") =>
  valid(v)
    ? new Date(v).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    : empty;

/** Value for <input type="date"> from a saved date-only field → "2016-07-20" */
export function calendarYMD(v: any): string {
  if (!valid(v)) return "";
  const t = new Date(v);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}