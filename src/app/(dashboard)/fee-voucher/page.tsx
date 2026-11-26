"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Ticket,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Percent,
  Users,
  Printer,
  Zap,
  CheckCheck,
  X,
  CircleAlert,
  Settings2,
  Search,
  School,
  type LucideIcon,
} from "lucide-react";
import { useTheme, lighten } from "@mui/material/styles";
import dayjs from "dayjs";
import PageHeader from "@/components/PageHeader";
import PageGuard from "@/components/PageGuard";
import { usePermissions } from "@/components/PermissionsProvider";
import { Button } from "@/components/ui/button";
import StudentSearchBox, { StudentOption } from "@/components/StudentSearchBox";
import { notify } from "@/lib/notify";
import { computeVoucherDates } from "@/lib/voucherDates";
import { printVouchers } from "@/lib/printFeeVoucher";
import { getSubdomain } from "@/lib/host";
import { toYMD } from "@/lib/pkTime";

// ────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const SEARCH_MODE = "__search__";
const fmtDate = (d: any) => (d ? dayjs(d).format("DD MMM YYYY") : "---");

// Detect the project's dark mode (<html> or <body> has "dark" class)
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const check = () =>
      setIsDark(
        html.classList.contains("dark") || body.classList.contains("dark"),
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    observer.observe(body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Class sections can be strings or objects — normalize to strings
const sectionNames = (cls: any): string[] =>
  (cls?.sections || [])
    .map((s: any) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean);

// Sort students by GR number
const byGr = (a: any, b: any) => {
  const x = Number(a.grNumber);
  const y = Number(b.grNumber);
  return isNaN(x) || isNaN(y)
    ? String(a.grNumber).localeCompare(String(b.grNumber))
    : x - y;
};

// Tabs: Class / Search
type Tab = "class" | "search";
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "class", label: "Select One Class", icon: School },
  { key: "search", label: "Search From All School", icon: Search },
];

// Filter styles (same light look as Bio Data / Bulk Info pages)
const TAB = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer";
const TAB_OFF = "text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100";
const TAB_ON =
  "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";
const CHIP =
  "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer";
const CHIP_OFF =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10";
const CHIP_ON =
  "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300";
const SEC = "inline-flex h-6 items-center rounded-full px-3 text-[11px] font-medium transition-colors cursor-pointer";
const SEC_OFF =
  "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
const SEC_ON = "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";

// Light buttons
const BTN_SKY =
  "h-9 border border-sky-300 bg-sky-100 px-4 text-xs font-semibold text-sky-700 shadow-none hover:bg-sky-200 cursor-pointer dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30";

// Makes the StudentSearchBox input match the other boxes
const SEARCH_LOOK = [
  "[&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border [&_input]:!text-sm",
  "[&_input]:!bg-white [&_input]:!text-slate-700 [&_input]:!border-slate-200",
  "dark:[&_input]:!bg-slate-900 dark:[&_input]:!text-slate-200 dark:[&_input]:!border-slate-700",
  "[&_input]:focus:!border-sky-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-sky-100 dark:[&_input]:focus:!ring-sky-500/20",
].join(" ");

// ─────────────────────────────────────────────────────────────
// UI pieces
// ─────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  right,
  children,
  bg,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bg?: string; // optional background (e.g. same colour as the tables)
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-1 dark:border-slate-700">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// Read-only tile (value comes from Settings)
function InfoTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold text-foreground">
          {value}
        </span>
        {hint && (
          <span className="block text-[10px] text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

// Issue date: month-in-words display + invisible native date input on top
function IssueDateTile({
  value,
  onChange,
  isDark,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <div className="group relative">
      <div className="pointer-events-none flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-shadow group-hover:shadow-sm group-focus-within:ring-2 group-focus-within:ring-sky-500/40 dark:border-slate-700 dark:bg-slate-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10">
          <CalendarDays className="w-4 h-4 text-sky-600 dark:text-sky-300" />
        </span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Issue Date
          </span>
          <span className="block text-sm font-semibold text-foreground">
            {fmtDate(value)}
          </span>
          <span className="block text-[10px] text-sky-600 dark:text-sky-400">
            Click to change
          </span>
        </span>
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            (e.currentTarget as any).showPicker?.();
          } catch {}
        }}
        aria-label="Issue Date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ colorScheme: isDark ? "dark" : "light" }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function FeeVoucherPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;
  const isDark = useIsDark();
  const { can } = usePermissions();
  const canPrint = can("vouchers", "export");
  const canOpenSettings = can("settings", "view");

  // Same background as the MRT tables (Classes, Students…): MUI theme colour
  const muiTheme = useTheme();
  const tableBg =
    muiTheme.palette.mode === "dark"
      ? lighten(muiTheme.palette.background.default, 0.05)
      : muiTheme.palette.background.default;

  const [issueDate, setIssueDate] = useState(toYMD());
  const [settings, setSettings] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Tab + mode ("" = nothing selected, SEARCH_MODE = search, otherwise a classId)
  const [tab, setTab] = useState<Tab>("class");
  const [mode, setMode] = useState("");
  const [section, setSection] = useState("all");

  // Class mode
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Search mode
  const [picked, setPicked] = useState<StudentOption[]>([]);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    vouchers: any[];
    skipped: number;
  } | null>(null);

  const isSearchMode = mode === SEARCH_MODE;
  const selectedClass = classes.find((c) => String(c._id) === mode);

  // Super admin: resolve school from subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  // Load settings + classes
  useEffect(() => {
    if (!schoolId) return;
    setClassesLoading(true);
    Promise.all([
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => r.json()),
      fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()),
    ])
      .then(([s, cls]) => {
        setSettings(s);
        setClasses(Array.isArray(cls) ? cls : []);
      })
      .catch(() => notify.error("Failed to load settings or classes"))
      .finally(() => setClassesLoading(false));
  }, [schoolId]);

  // Class mode: load students of the selected class + section
  useEffect(() => {
    setResult(null);
    if (!schoolId || !mode || isSearchMode) {
      setClassStudents([]);
      setSelected(new Set());
      return;
    }
    setLoadingStudents(true);
    fetch(
      `/api/Fee_Management/voucher-students?schoolId=${schoolId}&classId=${mode}&section=${encodeURIComponent(section)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClassStudents(list);
        setSelected(new Set(list.map((s: any) => s._id))); // all selected by default
      })
      .catch(() => notify.error("Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [schoolId, mode, section, isSearchMode]);

  // Clear result whenever inputs change
  useEffect(() => setResult(null), [issueDate, selected, picked]);

  // ── Values from Settings (read-only) ──
  const dates = useMemo(() => {
    if (!settings) return null;
    return computeVoucherDates(
      new Date(`${issueDate}T00:00:00`),
      settings.voucher?.dueDay || 10,
      settings.voucher?.validityDays || 0,
    );
  }, [settings, issueDate]);

  const lateFeeText = useMemo(() => {
    const lf = settings?.lateFee;
    if (!lf || !lf.value) return "Not set";
    return lf.mode === "percentage"
      ? `${lf.value}%`
      : `Rs. ${Number(lf.value).toLocaleString("en-US")}`;
  }, [settings]);

  const copies = settings?.voucher?.copies || 1;
  const perPageText =
    copies === 1
      ? "3 students per page"
      : `${copies} copies · 1 student per page`;

  // Students that will get vouchers
  const targetStudents = useMemo(
    () =>
      isSearchMode
        ? [...picked].sort(byGr)
        : classStudents.filter((s) => selected.has(s._id)),
    [isSearchMode, picked, classStudents, selected],
  );

  // ── Actions ──
  const changeMode = (value: string) => {
    setMode(value);
    setSection("all");
    setPicked([]);
    setResult(null);
  };

  // Tab: Class → wait for a class chip, Search → search box
  const changeTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    changeMode(t === "search" ? SEARCH_MODE : "");
  };

  // Class chip: choose, or click again to clear
  const pickClass = (id: string) => changeMode(mode === id ? "" : id);

  const toggleStudent = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addPicked = (s: StudentOption) => {
    // Check first (outside the state updater, so it runs only once)
    if (picked.some((p) => p._id === s._id)) {
      notify.error(`${s.fullName} is already added`);
      return;
    }
    setPicked((prev) =>
      prev.some((p) => p._id === s._id) ? prev : [...prev, s],
    );
  };

  const handleGenerate = useCallback(async () => {
    if (targetStudents.length === 0) {
      notify.error("Please select at least one student");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/Fee_Management/fee-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          issueDate,
          studentIds: targetStudents.map((s) => s._id),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data.message || "Failed to generate vouchers");
      setResult(data);
      if (data.vouchers.length === 0) {
        notify.error("None of the selected students have pending invoices");
      } else {
        notify.success(`${data.vouchers.length} voucher(s) ready to Print`);
      }
    } catch (e: any) {
      notify.error(e.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [schoolId, issueDate, targetStudents]);

  const grandTotal =
    result?.vouchers.reduce((sum, v) => sum + v.withinDue, 0) || 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Voucher Printing"
        icon={<Ticket className="w-4 h-4" />}
      />

      {/* ── Voucher details ── */}
      <Card
        title="Voucher Details"
        subtitle="Due date, validity and late fee are managed in School Settings."
        right={
          canOpenSettings ? (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-200 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
            >
              <Settings2 className="w-3.5 h-3.5" /> Open Settings
            </Link>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <IssueDateTile
            value={issueDate}
            onChange={setIssueDate}
            isDark={isDark}
          />
          <InfoTile
            icon={<CalendarClock className="w-4 h-4 text-amber-500" />}
            label="Due Date"
            value={dates ? fmtDate(dates.dueDate) : "..."}
            hint={
              settings
                ? `Day ${settings.voucher?.dueDay} of the month`
                : undefined
            }
          />
          <InfoTile
            icon={<CalendarCheck className="w-4 h-4 text-emerald-500" />}
            label="Valid Till"
            value={dates ? fmtDate(dates.validTill) : "..."}
            hint={
              settings?.voucher?.validityDays
                ? `Month end + ${settings.voucher.validityDays} day(s)`
                : "End of due month"
            }
          />
          <InfoTile
            icon={<Percent className="w-4 h-4 text-rose-500" />}
            label="Late Fee"
            value={lateFeeText}
            hint={
              settings?.lateFee?.autoApply
                ? "Applied automatically"
                : "Display only"
            }
          />
        </div>
      </Card>

      {/* ── Students ── */}
      <Card
        title="Select Students"
        right={
          targetStudents.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              <Users className="w-3.5 h-3.5" />
              {targetStudents.length} selected
            </span>
          )
        }
      >
        {/* Row 1: tabs + search box (Search tab) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => changeTab(t.key)}
                  className={`${TAB} ${tab === t.key ? TAB_ON : TAB_OFF}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {isSearchMode && (
            <div className={`w-full sm:w-80 ${SEARCH_LOOK}`}>
              <StudentSearchBox
                schoolId={schoolId}
                onSelect={addPicked}
                clearOnSelect
                showSearchButton={false}
                variant="page"
                placeholder="Name or GR #"
              />
            </div>
          )}
        </div>

        {/* Row 2: class chips (Class tab) */}
        {tab === "class" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {classesLoading ? (
              <span className="py-1.5 text-xs text-slate-400 dark:text-slate-500">Loading classes…</span>
            ) : classes.length === 0 ? (
              <span className="py-1.5 text-xs text-slate-400 dark:text-slate-500">No classes found</span>
            ) : (
              classes.map((c) => {
                const id = String(c._id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickClass(id)}
                    className={`${CHIP} ${mode === id ? CHIP_ON : CHIP_OFF}`}
                  >
                    {c.name}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Row 3: section chips (after a class is chosen) */}
        {selectedClass && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
            <span className="mr-1 text-[11px] text-slate-400 dark:text-slate-500">Section:</span>
            <button
              type="button"
              onClick={() => setSection("all")}
              className={`${SEC} ${section === "all" ? SEC_ON : SEC_OFF}`}
            >
              All
            </button>
            {sectionNames(selectedClass).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSection(sec)}
                className={`${SEC} ${section === sec ? SEC_ON : SEC_OFF}`}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

        {/* Students area */}
        <div
          className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800"
          style={{ backgroundColor: tableBg }}
        >
          {/* Toolbar (class mode only) */}
          {selectedClass && classStudents.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click a name to include or exclude
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelected(new Set(classStudents.map((s) => s._id)))
                  }
                  className="h-7 text-[11px] font-semibold cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" /> Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                  className="h-7 text-[11px] font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              </div>
            </div>
          )}

          {/* Toolbar (search mode) */}
          {isSearchMode && picked.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {picked.length} student(s) added — sorted by GR # when printed
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPicked([])}
                className="h-7 text-[11px] font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Remove all
              </Button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto p-3">
            {!mode ? (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Choose a class or search to begin.
              </p>
            ) : isSearchMode ? (
              picked.length === 0 ? (
                <p className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  <Search className="w-3.5 h-3.5" /> Search and pick students
                  from any class.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300"
                    >
                      <span>{s.fullName}</span>
                      <span className="text-sky-500 dark:text-sky-400/80">
                        ({s.className}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span className="rounded bg-sky-200 px-1 font-mono text-[10px] text-sky-800 dark:bg-sky-500/30 dark:text-sky-200">
                        {s.grNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPicked((prev) =>
                            prev.filter((p) => p._id !== s._id),
                          )
                        }
                        className="ml-0.5 rounded hover:bg-sky-200 cursor-pointer dark:hover:bg-sky-500/30"
                        aria-label={`Remove ${s.fullName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )
            ) : loadingStudents ? (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Loading students...
              </p>
            ) : classStudents.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No students found in this class / section.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {classStudents.map((s) => {
                  const on = selected.has(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => toggleStudent(s._id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        on
                          ? "border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40"
                      }`}
                    >
                      <span>{s.fullName}</span>
                      {s.section && (
                        <span className={on ? "text-sky-500 dark:text-sky-400/80" : "text-slate-400 dark:text-slate-500"}>
                          ({s.section})
                        </span>
                      )}
                      <span
                        className={`rounded px-1 font-mono text-[10px] ${
                          on
                            ? "bg-sky-200 text-sky-800 dark:bg-sky-500/30 dark:text-sky-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {s.grNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Generate */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[11px] text-slate-500 dark:text-slate-400">
            Only pending and partially paid invoices are included ·{" "}
            {perPageText}
          </span>
          {canPrint ? (
            <Button
              onClick={handleGenerate}
              disabled={generating || targetStudents.length === 0}
              className={BTN_SKY}
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              {generating ? "Generating..." : "Generate Fee Vouchers"}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <CircleAlert className="w-3.5 h-3.5" />
              You don&apos;t have permission to print vouchers
            </span>
          )}
        </div>
      </Card>

      {/* ── Result ── */}
      {result && (
        <Card
        bg={tableBg}
          title="Vouchers Ready"
          subtitle={`${result.vouchers.length} voucher(s) generated${
            result.skipped
              ? ` · ${result.skipped} student(s) skipped (no pending dues)`
              : ""
          }`}
          right={
            result.vouchers.length > 0 && (
              <Button
                onClick={() => printVouchers(result.vouchers)}
                className={BTN_SKY}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Fee Vouchers
              </Button>
            )
          }
        >
          {result.vouchers.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <CircleAlert className="w-4 h-4" />
              None of the selected students have pending invoices.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {[
                      "S#",
                      "GR #",
                      "Student Name",
                      "Parent Name",
                      "Class",
                      "Lines",
                      "Within Due",
                      "After Due",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`p-2 font-bold text-slate-500 dark:text-slate-400 ${
                          ["Lines", "Within Due", "After Due"].includes(h)
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.vouchers.map((v, i) => (
                    <tr
                      key={v.studentId}
                      className="border-t border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <td className="p-2 text-foreground">{i + 1}</td>
                      <td className="p-2 font-mono text-sky-700 dark:text-sky-300">
                        {v.student.grNumber}
                      </td>
                      <td className="p-2 font-medium text-foreground">
                        {v.student.name}
                      </td>
                      <td className="p-2 text-slate-500 dark:text-slate-400">
                        {v.student.parentName || "---"}
                      </td>
                      <td className="p-2 text-slate-500 dark:text-slate-400">
                        {v.student.className}
                        {v.student.section ? ` (${v.student.section})` : ""}
                      </td>
                      <td className="p-2 text-right">
                        <span className="inline-flex min-w-[26px] items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                          {v.items.length}
                        </span>
                      </td>
                      <td className="p-2 text-right font-semibold text-foreground">
                        {v.withinDue.toLocaleString("en-US")}
                      </td>
                      <td className="p-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {v.afterDue.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-bold dark:border-slate-700">
                    <td colSpan={6} className="p-2 text-slate-500 dark:text-slate-400">
                      Total
                    </td>
                    <td className="p-2 text-right text-foreground">
                      {grandTotal.toLocaleString("en-US")}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
export default function Page() {
  return (
    <PageGuard module="vouchers">
      <FeeVoucherPage />
    </PageGuard>
  );
}