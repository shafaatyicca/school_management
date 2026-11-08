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
} from "lucide-react";
import { TextField } from "@mui/material";
import dayjs from "dayjs";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import StudentSearchBox, { StudentOption } from "@/components/StudentSearchBox";
import { notify } from "@/lib/notify";
import { computeVoucherDates } from "@/lib/voucherDates";
import { printVouchers } from "@/lib/printFeeVoucher";

// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// UI pieces
// ─────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-1 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--muted-foreground)" }}
            >
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
    <div
      className="flex items-center gap-3 rounded-lg border px-3 py-1"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </span>
        <span className="block text-sm font-semibold text-foreground truncate">
          {value}
        </span>
        {hint && (
          <span
            className="block text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
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
      <div
        className="pointer-events-none flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-shadow group-hover:shadow-sm group-focus-within:ring-2 group-focus-within:ring-sky-500/40"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10">
          <CalendarDays className="w-4 h-4 text-sky-600 dark:text-sky-300" />
        </span>
        <span>
          <span
            className="block text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
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

export default function FeeVoucherPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;
  const isDark = useIsDark();

  const [issueDate, setIssueDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [settings, setSettings] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  // "" = nothing selected, SEARCH_MODE = search, otherwise a classId
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
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  // Load settings + classes
  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => r.json()),
      fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()),
    ])
      .then(([s, cls]) => {
        setSettings(s);
        setClasses(Array.isArray(cls) ? cls : []);
      })
      .catch(() => notify.error("Failed to load settings or classes"));
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
      const data = await res.json();
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
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
            style={{ borderColor: "var(--border)" }}
          >
            <Settings2 className="w-3.5 h-3.5" /> Open Settings
          </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            select
            label="Select By"
            size="small"
            value={mode}
            onChange={(e) => changeMode(e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">Choose a class or search</option>
            <option value={SEARCH_MODE}>Search Students</option>
            <optgroup label="Classes">
              {classes.map((c) => (
                <option key={c._id} value={String(c._id)}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </TextField>

          {/* Class mode → section; Search mode → search box */}
          {selectedClass && (
            <TextField
              select
              label="Section"
              size="small"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="all">All Sections</option>
              {sectionNames(selectedClass).map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </TextField>
          )}

          {isSearchMode && (
            <StudentSearchBox
              schoolId={schoolId}
              onSelect={addPicked}
              clearOnSelect
              showSearchButton={false}
              variant="page"
              placeholder="Type a student name or GR # and pick a student"
            />
          )}
        </div>

        {/* Students area */}
        <div
          className="mt-4 rounded-lg border"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--muted)",
          }}
        >
          {/* Toolbar (class mode only) */}
          {selectedClass && classStudents.length > 0 && (
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
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
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
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
              <p
                className="py-6 text-center text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Choose a class or &quot;Search Student&quot; to begin.
              </p>
            ) : isSearchMode ? (
              picked.length === 0 ? (
                <p
                  className="flex items-center justify-center gap-1.5 py-6 text-center text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Search className="w-3.5 h-3.5" /> Search and pick students
                  from any class.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-600 bg-sky-600 px-2 py-1 text-[11px] font-medium text-white"
                    >
                      <span>{s.fullName}</span>
                      <span className="text-sky-100">
                        ({s.className}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span className="rounded bg-sky-700 px-1 font-mono text-[10px]">
                        {s.grNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPicked((prev) =>
                            prev.filter((p) => p._id !== s._id),
                          )
                        }
                        className="ml-0.5 rounded hover:bg-sky-700 cursor-pointer"
                        aria-label={`Remove ${s.fullName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )
            ) : loadingStudents ? (
              <p
                className="py-6 text-center text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Loading students...
              </p>
            ) : classStudents.length === 0 ? (
              <p
                className="py-6 text-center text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
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
                          ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                          : "text-foreground hover:border-sky-400"
                      }`}
                      style={
                        on
                          ? undefined
                          : {
                              borderColor: "var(--border)",
                              backgroundColor: "var(--card)",
                            }
                      }
                    >
                      <span>{s.fullName}</span>
                      {s.section && (
                        <span
                          className={on ? "text-sky-100" : ""}
                          style={
                            on
                              ? undefined
                              : { color: "var(--muted-foreground)" }
                          }
                        >
                          ({s.section})
                        </span>
                      )}
                      <span
                        className={`rounded px-1 font-mono text-[10px] ${on ? "bg-sky-700 text-white" : ""}`}
                        style={
                          on ? undefined : { backgroundColor: "var(--muted)" }
                        }
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
          <span
            className="text-[11px] mr-auto"
            style={{ color: "var(--muted-foreground)" }}
          >
            Only pending and partially paid invoices are included ·{" "}
            {perPageText}
          </span>
          <Button
            onClick={handleGenerate}
            disabled={generating || targetStudents.length === 0}
            className="h-9 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white text-xs font-semibold px-4 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            {generating
              ? "Generating..."
              : `Generate Fee Vouchers`}
          </Button>
        </div>
      </Card>

      {/* ── Result ── */}
      {result && (
        <Card
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
                className="h-9 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 cursor-pointer"
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
            <div
              className="rounded-md border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
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
                        className={`p-2 font-bold ${
                          ["Lines", "Within Due", "After Due"].includes(h)
                            ? "text-right"
                            : "text-left"
                        }`}
                        style={{ color: "var(--muted-foreground)" }}
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
                      className="border-t"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor:
                          i % 2 === 0 ? "var(--card)" : "var(--muted)",
                      }}
                    >
                      <td className="p-2 text-foreground">{i + 1}</td>
                      <td className="p-2 font-mono text-sky-700 dark:text-sky-300">
                        {v.student.grNumber}
                      </td>
                      <td className="p-2 font-medium text-foreground">
                        {v.student.name}
                      </td>
                      <td className="p-2" style={{ color: "var(--muted-foreground)" }}>
                        {v.student.parentName || "---"}
                        </td>
                      <td
                        className="p-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
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
                  <tr
                    className="border-t font-bold"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--muted)",
                    }}
                  >
                    <td
                      colSpan={6}
                      className="p-2"
                      style={{ color: "var(--muted-foreground)" }}
                    >
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
