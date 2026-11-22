"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useSession } from "next-auth/react";
import {
  History,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Loader2,
  Users,
  RotateCw,
  X,
  Globe,
  Monitor,
  Clock,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";

// ── Helpers ──────────────────────────────────────────────────

const PK = "Asia/Karachi";
const PAGE_SIZES = [25, 50, 75, 100];

// Today in Pakistan as YYYY-MM-DD
const pkToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: PK, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );

const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const pkDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: PK, day: "2-digit", month: "short", year: "numeric" });

const pkClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: PK, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

const pkTime = (iso: string) => `${pkDate(iso)}, ${pkClock(iso)}`;

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// "Mozilla/5.0 (Windows NT 10.0…) Chrome/…" → "Chrome · Windows"
function device(ua: string) {
  if (!ua) return "---";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

const fmtValue = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  // Date-only values (saved at midnight UTC) → just the date, no "05:00:00 AM"
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(v)) return pkDate(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return pkTime(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const isEmptyValue = (v: any) => v === null || v === undefined || v === "";

// Database field names → readable names (anything not listed is made readable automatically)
const FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  grNumber: "GR No.",
  bFormNumber: "B-Form No.",
  cnic: "CNIC",
  nicNumber: "CNIC",
  p_id: "P-ID",
  emp_id: "Employee ID",
  classId: "Class",
  parentId: "Parent",
  cast: "Caste",
  dateOfBirth: "Date of Birth",
  placeOfBirth: "Place of Birth",
  enrollmentDate: "Enrollment Date",
  joiningDate: "Joining Date",
  inactiveDate: "Inactive Date",
  inactiveReason: "Inactive Reason",
  previousSchool: "Previous School",
  detailedNote: "Detailed Note",
  staffCategory: "Staff Category",
  baseFee: "Base Fee",
  customNetFee: "Net Fee",
  discountType: "Discount Type",
  discountValue: "Discount",
  maxBaseFee: "Fee",
  feeSource: "Fee Source",
  isMonthly: "Monthly",
  classFee: "Class Fee",
};

// "motherProfession" → "Mother Profession", "emergencyContact.phone" → "Emergency Contact Phone"
const autoLabel = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fieldLabel = (field: string) => {
  const f = String(field || "");
  if (FIELD_LABELS[f]) return FIELD_LABELS[f];
  return f
    .split(".")
    .map((part) => FIELD_LABELS[part] || autoLabel(part))
    .join(" ");
};

// "feeCategories" → "fee Categories" (CSS capitalize does the rest)
const moduleLabel = (m: string) => String(m || "").replace(/([A-Z])/g, " $1");

// "Received Rs. 7,000 (Bank) — PID-0031 · Hostel Fee" → ["Received Rs. 7,000 (Bank)", "PID-0031", "Hostel Fee"]
const summaryParts = (s: string) =>
  String(s || "")
    .split(/\s+[—·]\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

// Short text for the table: only the first part
const shortSummary = (s: string) => summaryParts(s)[0] || s || "—";

const ACTIONS: Record<string, { label: string; cls: string }> = {
  login: { label: "Login", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  login_failed: { label: "Failed Login", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  create: { label: "Create", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  update: { label: "Update", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  delete: { label: "Delete", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  payment: { label: "Payment", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  reverse: { label: "Reverse", cls: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  view: { label: "View", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  export: { label: "Export", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  print: { label: "Print", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
};

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "all", label: "All" },
];

const roleLabel = (r: string) => (r || "").replace(/_/g, " ");

// ── Page ─────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = isSuperAdmin || role === "school_admin";

  // Admins can also open only their own logs with ?mine=1
  const [mineParam, setMineParam] = useState(false);
  useEffect(() => {
    setMineParam(new URLSearchParams(window.location.search).get("mine") === "1");
  }, []);
  // Staff: always only their own logs (the API forces this too)
  const mine = !isAdmin || mineParam;

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState(""); // "" = all users (admins only)
  const [range, setRange] = useState("7");
  const [action, setAction] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [data, setData] = useState<any>({ logs: [], total: 0, pages: 1, users: [], months: [], canDelete: false });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const [deleteMonth, setDeleteMonth] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // School id (super admin → from subdomain)
  useEffect(() => {
    if (session?.user?.schoolId) {
      setSchoolId(session.user.schoolId);
      return;
    }
    if (!isSuperAdmin) return;
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}&fields=basic`)
        .then((r) => r.json())
        .then((d) => d?._id && setSchoolId(d._id))
        .catch(() => {});
    }
  }, [isSuperAdmin, session?.user?.schoolId]);

  // Search: wait 400ms after typing
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // Back to page 1 when filters / page size change
  useEffect(() => setPage(1), [userId, range, action, q, limit]);

  const load = useCallback(async () => {
    if (!schoolId || status !== "authenticated") return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ schoolId, page: String(page), limit: String(limit) });
      if (mine) p.set("mine", "1");
      else if (userId) p.set("userId", userId);
      if (action) p.set("action", action);
      if (q) p.set("q", q);
      const today = pkToday();
      if (range === "today") {
        p.set("from", today);
        p.set("to", today);
      } else if (range !== "all") {
        p.set("from", addDays(today, -(Number(range) - 1)));
        p.set("to", today);
      }
      const res = await fetch(`/api/activity-logs?${p.toString()}`);
      const json = await res.json().catch(() => ({ message: `Logs API failed (${res.status})` }));
      if (!res.ok) throw new Error(json.message || "Failed to load logs");
      setData(json);
      setOpen(new Set());
    } catch (e: any) {
      notify.error(e.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [schoolId, status, mine, page, limit, userId, action, q, range]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAll = useMemo(
    () => data.users.reduce((sum: number, u: any) => sum + u.count, 0),
    [data.users],
  );

  const filtersOn = !!((!mine && userId) || action || qInput || range !== "7");
  const clearFilters = () => {
    setUserId("");
    setAction("");
    setQInput("");
    setRange("7");
  };

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDelete = async () => {
    if (!deleteMonth || !schoolId) return;
    try {
      const res = await fetch("/api/activity-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, month: deleteMonth }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Delete failed");
      notify.success(`${json.deleted} log(s) of ${monthLabel(deleteMonth)} deleted`);
      setDeleteMonth("");
      load();
    } catch (e: any) {
      notify.error(e.message || "Delete failed");
    } finally {
      setConfirmOpen(false);
    }
  };

  if (status === "loading") return null;

  const card = { borderColor: "var(--border)", backgroundColor: "var(--card)" };
  const muted = { color: "var(--muted-foreground)" };
  const selectedMonth = data.months.find((m: any) => m.month === deleteMonth);

  const currentPage = data.page || page;
  const from = data.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, data.total);

  const pagerBtn = "h-8 w-8 p-0 cursor-pointer";

  // "My" view has no User column
  const headers = mine
    ? ["Time (PKT)", "Action", "Module", "Details", "Device", ""]
    : ["Time (PKT)", "User", "Action", "Module", "Details", "Device", ""];
  const COLS = headers.length;

  return (
    <div className="space-y-3">
      <PageHeader title={mine ? "My Activity Log" : "Activity Logs"} icon={<History className="w-4 h-4" />} />

      {/* ── Filters ── */}
      <div className="rounded-xl border p-4 space-y-3" style={card}>
        {/* Users (admins only) */}
        {!mine && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={muted}>
              <Users className="w-3.5 h-3.5" /> Users
            </span>
            {[{ userId: "", userName: "All", userRole: "", count: totalAll }, ...data.users].map((u: any) => {
              const on = userId === u.userId;
              return (
                <button
                  key={u.userId || "all"}
                  type="button"
                  onClick={() => setUserId(u.userId)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-7 text-[11px] font-semibold transition-colors cursor-pointer ${
                    on ? "border-sky-600 bg-sky-600 text-white" : "text-foreground hover:border-sky-400"
                  }`}
                  style={on ? undefined : { borderColor: "var(--border)" }}
                >
                  {u.userName || "Unknown"}
                  {u.userRole && (
                    <span className={`capitalize ${on ? "text-sky-100" : ""}`} style={on ? undefined : muted}>
                      · {roleLabel(u.userRole)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : ""}`}
                    style={on ? undefined : { backgroundColor: "var(--muted)" }}
                  >
                    {u.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Range, action, search, refresh, delete */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-3 h-8 text-[11px] font-semibold cursor-pointer ${
                  range === r.key
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "text-foreground hover:bg-[color:var(--muted)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-8 rounded-lg border px-2 text-xs text-foreground cursor-pointer"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
          >
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <div
            className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border px-2 h-8"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
          >
            <Search className="w-3.5 h-3.5" style={muted} />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={mine ? "Search student, receipt…" : "Search name, student, receipt…"}
              className="flex-1 bg-transparent text-xs text-foreground outline-none"
            />
            {qInput && (
              <button type="button" onClick={() => setQInput("")} className="cursor-pointer" aria-label="Clear search">
                <X className="w-3.5 h-3.5" style={muted} />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            onClick={load}
            disabled={loading}
            className="h-8 text-xs font-semibold cursor-pointer"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {filtersOn && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}

          {/* Super Admin: delete a whole month (full view only) */}
          {data.canDelete && !mine && (
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <select
                value={deleteMonth}
                onChange={(e) => setDeleteMonth(e.target.value)}
                className="h-8 rounded-lg border px-2 text-xs text-foreground cursor-pointer"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                <option value="">Select month…</option>
                {data.months.map((m: any) => (
                  <option key={m.month} value={m.month}>
                    {monthLabel(m.month)} ({m.count})
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!deleteMonth}
                variant="outline"
                className="h-8 text-xs font-semibold text-rose-600 border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Month
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border overflow-hidden" style={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead style={{ backgroundColor: "var(--muted)" }}>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2.5 font-bold whitespace-nowrap ${i === COLS - 1 ? "text-right" : "text-left"}`}
                    style={muted}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLS} className="p-10 text-center" style={muted}>
                    <Loader2 className="inline w-4 h-4 animate-spin mr-1" /> Loading logs…
                  </td>
                </tr>
              ) : data.logs.length === 0 ? (
                <tr>
                  <td colSpan={COLS} className="p-10 text-center" style={muted}>
                    No activity found{filtersOn ? " for these filters." : "."}
                  </td>
                </tr>
              ) : (
                data.logs.map((log: any, idx: number) => {
                  const id = String(log._id);
                  const isOpen = open.has(id);
                  const a = ACTIONS[log.action] || { label: log.action, cls: "bg-slate-100 text-slate-700" };
                  const changes: any[] = log.changes || [];
                  const changeCount = changes.length;
                  const parts = summaryParts(log.summary);

                  // New record → only "after" values; deleted record → only "before" values
                  const onlyNew = changeCount > 0 && changes.every((c) => isEmptyValue(c.from));
                  const onlyOld = changeCount > 0 && !onlyNew && changes.every((c) => isEmptyValue(c.to));

                  return (
                    <Fragment key={id}>
                      {/* Main row: click anywhere to open details */}
                      <tr
                        onClick={() => toggle(id)}
                        className={`border-t align-middle cursor-pointer transition-colors hover:bg-sky-500/5 ${
                          isOpen ? "bg-sky-500/5" : ""
                        }`}
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: isOpen ? undefined : idx % 2 ? "var(--muted)" : undefined,
                        }}
                      >
                        <td className="px-3 py-1 whitespace-nowrap">
                          <span className="block font-medium text-foreground">{pkDate(log.createdAt)}</span>
                          <span className="block text-[10px] tabular-nums" style={muted}>
                            {pkClock(log.createdAt)}
                          </span>
                        </td>
                        {!mine && (
                          <td className="px-3 py-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // filter, don't open the row
                                if (log.userId) setUserId(log.userId);
                              }}
                              title="Show only this user's activity"
                              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                            >
                              {log.userName || "Unknown"}
                            </button>
                            <span className="block text-[10px] capitalize" style={muted}>
                              {roleLabel(log.userRole)}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-1">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${a.cls}`}>
                            {a.label}
                          </span>
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap capitalize text-foreground">{moduleLabel(log.module)}</td>
                        {/* Short details (full text in the tooltip and when opened) */}
                        <td className="px-3 py-1 text-foreground max-w-[360px]">
                          <span className="block truncate" title={log.summary || ""}>
                            {shortSummary(log.summary)}
                          </span>
                          {log.entityLabel && (
                            <span className="block truncate text-[11px]" style={muted} title={log.entityLabel}>
                              {log.entityLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap" style={muted}>
                          {device(log.userAgent)}
                        </td>
                        <td className="px-3 py-1 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 h-6 text-[10px] font-semibold ${
                              changeCount
                                ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
                                : "text-foreground"
                            }`}
                            style={changeCount ? undefined : { borderColor: "var(--border)" }}
                          >
                            {changeCount ? `${changeCount} change${changeCount > 1 ? "s" : ""}` : "Details"}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </span>
                        </td>
                      </tr>

                      {/* Details */}
                      {isOpen && (
                        <tr style={{ backgroundColor: "var(--muted)" }}>
                          <td colSpan={COLS} className="px-3 py-3">
                            <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                              <div className="rounded-lg border p-3 space-y-3" style={card}>
                                {/* What happened (every log) */}
                                <div>
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={muted}>
                                    Details
                                  </p>
                                  <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[11px]">
                                    <span style={muted}>Action</span>
                                    <span className="font-medium text-foreground">{a.label}</span>

                                    <span style={muted}>Module</span>
                                    <span className="capitalize text-foreground">{moduleLabel(log.module) || "—"}</span>

                                    {log.entityLabel && (
                                      <>
                                        <span style={muted}>Record</span>
                                        <span className="text-foreground">{log.entityLabel}</span>
                                      </>
                                    )}

                                    <span style={muted}>Description</span>
                                    <span className="text-foreground">
                                      {parts.length > 1 ? (
                                        <ul className="list-disc space-y-0.5 pl-4">
                                          {parts.map((p, i) => (
                                            <li key={i}>{p}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        log.summary || "—"
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Field values / what changed (only when recorded) */}
                                {changeCount > 0 && (
                                  <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={muted}>
                                      {onlyNew ? "Saved values" : onlyOld ? "Removed values" : "What changed"}
                                    </p>

                                    {onlyNew || onlyOld ? (
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr style={muted}>
                                            <th className="pb-1 pr-4 text-left font-semibold">Field</th>
                                            <th className="pb-1 text-left font-semibold">Value</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {changes.map((c: any, i: number) => (
                                            <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                              <td className="py-1 pr-4 font-medium text-foreground">{fieldLabel(c.field)}</td>
                                              <td className="py-1">
                                                <span
                                                  className={`rounded px-1.5 py-0.5 ${
                                                    onlyNew
                                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                                                  }`}
                                                >
                                                  {fmtValue(onlyNew ? c.to : c.from)}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr style={muted}>
                                            <th className="pb-1 pr-4 text-left font-semibold">Field</th>
                                            <th className="pb-1 pr-4 text-left font-semibold">Before</th>
                                            <th className="pb-1 text-left font-semibold">After</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {changes.map((c: any, i: number) => (
                                            <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                              <td className="py-1 pr-4 font-medium text-foreground">{fieldLabel(c.field)}</td>
                                              <td className="py-1 pr-4">
                                                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                                  {fmtValue(c.from)}
                                                </span>
                                              </td>
                                              <td className="py-1">
                                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                  {fmtValue(c.to)}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Where / when */}
                              <div className="rounded-lg border p-3 space-y-2 text-[11px]" style={card}>
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={muted}>
                                  Session
                                </p>
                                <p className="flex items-center gap-2 text-foreground">
                                  <Clock className="w-3.5 h-3.5 shrink-0" style={muted} />
                                  {pkTime(log.createdAt)}
                                </p>
                                <p className="flex items-center gap-2 text-foreground">
                                  <Globe className="w-3.5 h-3.5 shrink-0" style={muted} />
                                  IP: {log.ip || "---"}
                                </p>
                                <p className="flex items-start gap-2 text-foreground">
                                  <Monitor className="w-3.5 h-3.5 shrink-0 mt-0.5" style={muted} />
                                  <span className="break-all">{log.userAgent || "---"}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span style={muted}>Rows per page</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-8 rounded-lg border px-2 text-xs text-foreground cursor-pointer"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span style={muted}>
              Showing <b className="text-foreground">{from}–{to}</b> of <b className="text-foreground">{data.total}</b>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className={pagerBtn} disabled={currentPage <= 1 || loading} onClick={() => setPage(1)} title="First page">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className={pagerBtn} disabled={currentPage <= 1 || loading} onClick={() => setPage((p) => p - 1)} title="Previous page">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 whitespace-nowrap text-foreground">
              Page <b>{currentPage}</b> of <b>{data.pages}</b>
            </span>
            <Button variant="outline" size="sm" className={pagerBtn} disabled={currentPage >= data.pages || loading} onClick={() => setPage((p) => p + 1)} title="Next page">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className={pagerBtn} disabled={currentPage >= data.pages || loading} onClick={() => setPage(data.pages)} title="Last page">
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        itemName={
          deleteMonth
            ? `all activity logs of ${monthLabel(deleteMonth)} (${selectedMonth?.count || 0} entries)`
            : ""
        }
      />
    </div>
  );
}