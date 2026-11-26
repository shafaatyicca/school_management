"use client";

import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import {
  UserCog,
  Users,
  CheckCheck,
  Check,
  X,
  Save,
  Loader2,
  Filter,
  Cake,
  CalendarPlus,
  School,
  LayoutGrid,
  FileText,
  Layers,
  Search,
  Info,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageGuard from "@/components/PageGuard";
import { usePermissions } from "@/components/PermissionsProvider";
import { useTheme, lighten } from "@mui/material/styles";
import { notify } from "@/lib/notify";
import { getSubdomain } from "@/lib/host";
import StudentSearchBox, { type StudentOption } from "@/components/StudentSearchBox";

type Field = "dateOfBirth" | "enrollmentDate" | "classId" | "section" | "bFormNumber";

const FIELDS: { key: Field; label: string; short: string; icon: LucideIcon }[] = [
  { key: "dateOfBirth", label: "Date of Birth", short: "DOB", icon: Cake },
  { key: "enrollmentDate", label: "Admission Date", short: "Admission Date", icon: CalendarPlus },
  { key: "classId", label: "Class", short: "Class", icon: School },
  { key: "section", label: "Section", short: "Section", icon: LayoutGrid },
  { key: "bFormNumber", label: "B-Form Number", short: "B-Form", icon: FileText },
];

type Stu = {
  _id: string;
  grNumber: number;
  fullName: string;
  classId?: { _id: string; name: string } | null;
  section?: string;
  dateOfBirth?: string;
  enrollmentDate?: string;
  bFormNumber?: string;
  parentId?: { fullName?: string; phone?: string } | null;
  motherPhone?: string;
};
type Edit = { value: string; section?: string };

// How students are picked
type PickBy = "one" | "multi" | "search";
const PICK_TABS: { key: PickBy; label: string; icon: LucideIcon }[] = [
  { key: "one", label: "Select One class", icon: School },
  { key: "multi", label: "Select Multiple classes", icon: Layers },
  { key: "search", label: "Search From All School", icon: Search },
];

const sectionNames = (cls: any): string[] =>
  (cls?.sections || []).map((s: any) => (typeof s === "string" ? s : s?.name)).filter(Boolean);

// Dates in Pakistan time
const pkYmd = (d?: string) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }) : "");
const niceDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" })
    : "";

// Typing "25112026" → "25-11-2026"
function maskDmy(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

// "25-11-2026" → "2026-11-25" ("" if not a real full date)
function parseDmy(v: string) {
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yy] = m;
  const d = new Date(Date.UTC(+yy, +mm - 1, +dd));
  if (d.getUTCFullYear() !== +yy || d.getUTCMonth() !== +mm - 1 || d.getUTCDate() !== +dd) return "";
  return `${yy}-${mm}-${dd}`;
}

// B-Form: typing "1234512345671" → "12345-1234567-1"
const onlyDigits = (v?: string) => String(v || "").replace(/\D/g, "");
function maskBForm(v: string) {
  const d = onlyDigits(v).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

const CELL_INPUT =
  "h-8 rounded-md border bg-white px-2 text-xs text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-sky-500/20";

// Step 1: field tiles (same light colours as the class chips, thin 1px border)
const TILE =
  "flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors cursor-pointer";
const TILE_OFF =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10";
const TILE_ON =
  "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300";

// Step 2: tabs (amber, same as the summary line) + class / section chips
const TABS_BOX = "inline-flex flex-wrap gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800";
const TAB = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer";
const TAB_OFF = "text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100";
const TAB_ON =
  "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";
const CHIP =
  "inline-flex h-8 items-center gap-1 rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer";
const CHIP_OFF =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10";
const CHIP_ON =
  "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300";
const SEC = "inline-flex h-6 items-center rounded-full px-3 text-[11px] font-medium transition-colors cursor-pointer";
const SEC_OFF =
  "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
const SEC_ON = "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";

// Makes the StudentSearchBox input look like the other boxes
const SEARCH_LOOK = [
  "[&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border [&_input]:!text-sm",
  "[&_input]:!bg-white [&_input]:!text-slate-700 [&_input]:!border-slate-200",
  "dark:[&_input]:!bg-slate-900 dark:[&_input]:!text-slate-200 dark:[&_input]:!border-slate-700",
  "[&_input]:focus:!border-sky-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-sky-100 dark:[&_input]:focus:!ring-sky-500/20",
].join(" ");

function StepTitle({ n, text }: { n: number; text: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
        {n}
      </span>
      {text}
    </p>
  );
}

function BulkInfoPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const muiTheme = useTheme();
  const tableBg =
    muiTheme.palette.mode === "dark"
      ? lighten(muiTheme.palette.background.default, 0.05)
      : muiTheme.palette.background.default;

  const { can } = usePermissions();
  const canEdit = can("bulkInfo", "edit");

  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [by, setBy] = useState<PickBy>("one");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [section, setSection] = useState("");
  const [field, setField] = useState<Field>("dateOfBirth");

  const [pool, setPool] = useState<Stu[]>([]); // students shown as chips
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [allValue, setAllValue] = useState<Edit>({ value: "" });
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  const bodyRef = useRef<HTMLTableSectionElement>(null);

  // Super admin: school from the subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  // Classes (sorted by order)
  useEffect(() => {
    if (!schoolId) return;
    setClassesLoading(true);
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) =>
        setClasses(Array.isArray(d) ? [...d].sort((a, b) => (a.order || 0) - (b.order || 0)) : []),
      )
      .catch(() => notify.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, [schoolId]);

  const classById = useMemo(() => new Map(classes.map((c) => [String(c._id), c])), [classes]);

  // Which classes to load
  const loadIds = useMemo(() => (by === "search" ? [] : classIds), [by, classIds]);
  const loadKey = loadIds.join(",");

  // Sections of the chosen class(es)
  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    loadIds.forEach((id) => sectionNames(classById.get(id)).forEach((s) => set.add(s)));
    return [...set];
  }, [loadIds, classById]);

  // Load students of the chosen class(es) + section
  useEffect(() => {
    if (by === "search") return;
    if (!schoolId || !loadKey) {
      setPool([]);
      setSelected(new Set());
      return;
    }
    let stop = false;
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ schoolId: String(schoolId), classIds: loadKey });
        if (section) p.set("section", section);
        const res = await fetch(`/api/students-bulk-update?${p.toString()}`);
        const data = await res.json().catch(() => null);
        if (stop) return;
        if (!res.ok) {
          notify.error(data?.message || "Failed to load students");
          setPool([]);
          return;
        }
        const list: Stu[] = Array.isArray(data?.students) ? data.students : [];
        setPool(list);
        // Class(es) loaded → everyone ticked
        setSelected(new Set(list.map((s) => String(s._id))));
        setEdits({});
        setSaveErrors([]);
      } catch {
        if (!stop) notify.error("Failed to load students");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [schoolId, loadKey, section, by]);

  // Tab change (One class / Multiple classes / Search) → start fresh
  const changeBy = (v: PickBy) => {
    if (v === by) return;
    setBy(v);
    setClassIds([]);
    setSection("");
    setPool([]);
    setSelected(new Set());
    setEdits({});
    setSaveErrors([]);
  };

  // Class chip: One class → pick / unpick, Multiple → add / remove
  const pickClass = (id: string) => {
    setClassIds((prev) => {
      if (by === "one") return prev[0] === id ? [] : [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
    setSection("");
  };

  const changeField = (f: Field) => {
    setField(f);
    setEdits({});
    setAllValue({ value: "" });
    setSaveErrors([]);
  };

  // Picked in the search box → load the full record (DOB, admission date, parent…) and add it
  const addFromSearch = async (opt: StudentOption) => {
    if (!schoolId) return;
    if (pool.some((x) => String(x._id) === String(opt._id))) {
      notify.error(`${opt.fullName} is already added`);
      return;
    }
    try {
      const p = new URLSearchParams({ schoolId: String(schoolId), ids: String(opt._id) });
      const res = await fetch(`/api/students-bulk-update?${p.toString()}`);
      const data = await res.json().catch(() => null);
      const s: Stu | undefined = res.ok && Array.isArray(data?.students) ? data.students[0] : undefined;
      if (!s) {
        notify.error(data?.message || "Only active students can be changed here");
        return;
      }
      setPool((prev) => (prev.some((x) => String(x._id) === String(s._id)) ? prev : [...prev, s]));
      setSelected((prev) => new Set(prev).add(String(s._id)));
    } catch {
      notify.error("Failed to load student");
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAll = () => setSelected(new Set(pool.map((s) => String(s._id))));
  const clearAll = () => {
    setSelected(new Set());
    if (by === "search") setPool([]);
  };

  // Table rows = ticked students (chip order)
  const rows = useMemo(() => pool.filter((s) => selected.has(String(s._id))), [pool, selected]);

  const setEdit = (id: string, patch: Partial<Edit>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || { value: "" }), ...patch } }));

  const isDate = field === "dateOfBirth" || field === "enrollmentDate";
  const isBForm = field === "bFormNumber";

  const isInvalid = (s: Stu) => {
    const e = edits[String(s._id)];
    if (!e?.value) return false;
    if (isDate) return !parseDmy(e.value);
    if (isBForm) return onlyDigits(e.value).length !== 13;
    if (field === "classId") return !e.section;
    return false;
  };

  const isChanged = (s: Stu) => {
    const e = edits[String(s._id)];
    if (!e?.value) return false;
    if (isDate) {
      const v = parseDmy(e.value);
      return !!v && v !== pkYmd((s as any)[field]);
    }
    if (isBForm) {
      const d = onlyDigits(e.value);
      return d.length === 13 && d !== onlyDigits(s.bFormNumber);
    }
    if (field === "section") return e.value !== s.section;
    return !!e.section && !(e.value === String(s.classId?._id) && e.section === s.section);
  };

  const changedCount = rows.filter(isChanged).length;
  const invalidCount = rows.filter(isInvalid).length;

  // Enter → same box in the next row (Tab works on its own)
  const focusCell = (row: number, col: number) =>
    bodyRef.current?.querySelector<HTMLElement>(`[data-nav="${row}-${col}"]`)?.focus();
  const onEnter = (e: KeyboardEvent, row: number, col: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusCell(row + 1, col);
    }
  };

  // Sections available in the "apply to all" box
  const allSections = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((s) => sectionNames(classById.get(String(s.classId?._id))).forEach((x) => set.add(x)));
    return [...set];
  }, [rows, classById]);

  const applyAll = () => {
    if (!rows.length) return;
    if (isDate) {
      if (!parseDmy(allValue.value)) return notify.error("Enter a full date (dd-mm-yyyy)");
      setEdits((prev) => {
        const n = { ...prev };
        rows.forEach((s) => (n[String(s._id)] = { value: allValue.value }));
        return n;
      });
    } else if (field === "section") {
      if (!allValue.value) return notify.error("Choose a section");
      const ok = rows.filter((s) =>
        sectionNames(classById.get(String(s.classId?._id))).includes(allValue.value),
      );
      setEdits((prev) => {
        const n = { ...prev };
        ok.forEach((s) => (n[String(s._id)] = { value: allValue.value }));
        return n;
      });
      const skipped = rows.length - ok.length;
      if (skipped) notify.error(`${skipped} student(s) skipped: their class has no "${allValue.value}" section`);
    } else if (field === "classId") {
      if (!allValue.value || !allValue.section) return notify.error("Choose a class and a section");
      setEdits((prev) => {
        const n = { ...prev };
        rows.forEach((s) => (n[String(s._id)] = { value: allValue.value, section: allValue.section }));
        return n;
      });
    }
  };

  const save = async () => {
    if (!schoolId) return;
    setSaveErrors([]);
    if (invalidCount) return notify.error("Fix the highlighted rows first");
    const changes = rows.filter(isChanged).map((s) => {
      const e = edits[String(s._id)];
      if (field === "classId") return { id: s._id, value: e.value, section: e.section };
      if (field === "section") return { id: s._id, value: e.value };
      if (isBForm) return { id: s._id, value: onlyDigits(e.value) };
      return { id: s._id, value: parseDmy(e.value) };
    });
    if (!changes.length) return notify.error("No changes to save");

    setSaving(true);
    try {
      const res = await fetch("/api/students-bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, field, changes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(data?.message || "Failed to save changes");
        if (Array.isArray(data?.errors)) setSaveErrors(data.errors);
        return;
      }
      const upd = new Map<string, Stu>(
        (Array.isArray(data?.students) ? data.students : []).map((s: Stu) => [String(s._id), s] as [string, Stu]),
      );
      setPool((p) => p.map((s) => upd.get(String(s._id)) ?? s));
      setEdits({});
      setAllValue({ value: "" });
      notify.success(`${data?.updated ?? changes.length} student(s) updated`);
    } catch {
      notify.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const fieldInfo = FIELDS.find((f) => f.key === field)!;

  const currentText = (s: Stu) => {
    if (isDate) return niceDate((s as any)[field]);
    if (isBForm) return s.bFormNumber || "";
    if (field === "section") return s.section || "";
    return `${s.classId?.name || "—"} (${s.section || ""})`;
  };

  // Who is being changed (for the summary line)
  const targetText = (() => {
    if (by === "search") return "searched students";
    const names = classIds.map((id) => classById.get(id)?.name).filter(Boolean).join(", ");
    return `${names} (${section || "All sections"})`;
  })();

  const hasPicker = by === "search" || classIds.length > 0;

  return (
    <div className="space-y-3">
      <PageHeader title="Students Bulk Info Change" icon={<UserCog className="w-4 h-4" />} />

      {/* ── Filters: step 1 (field) + step 2 (students) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Step 1 — what to change */}
        <StepTitle n={1} text="What do you want to change?" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FIELDS.map((f) => {
            const Icon = f.icon;
            const on = field === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => changeField(f.key)}
                className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="my-4 border-t border-dashed border-slate-200 dark:border-slate-700" />

        {/* Step 2 — pick students */}
        <StepTitle n={2} text="Pick students" />
                {/* Tabs + search box in one line */}
        <div className={`flex flex-wrap items-center gap-3 ${by === "search" ? "" : "mb-3"}`}>
          <div className={TABS_BOX}>
            {PICK_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => changeBy(t.key)}
                  className={`${TAB} ${by === t.key ? TAB_ON : TAB_OFF}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Search tab: same search box as Fee Ledger / Bio Data */}
          {by === "search" && (
            <div className={`w-full sm:w-80 ${SEARCH_LOOK}`}>
              <StudentSearchBox
                schoolId={schoolId}
                onSelect={addFromSearch}
                clearOnSelect
                showSearchButton={false}
                variant="page"
                placeholder="Name or GR #"
              />
            </div>
          )}
        </div>

        {by !== "search" && (
          <>
            {/* Class chips */}
            <div className="flex flex-wrap gap-1.5">
              {classesLoading ? (
                <span className="py-1.5 text-xs text-slate-400 dark:text-slate-500">Loading classes…</span>
              ) : classes.length === 0 ? (
                <span className="py-1.5 text-xs text-slate-400 dark:text-slate-500">No classes found</span>
              ) : (
                classes.map((c) => {
                  const id = String(c._id);
                  const on = classIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickClass(id)}
                      className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                    >
                      {by === "multi" && on && <Check className="h-3.5 w-3.5" />}
                      {c.name}
                    </button>
                  );
                })
              )}
            </div>

            {/* Section chips */}
            {classIds.length > 0 && sectionOptions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-slate-400 dark:text-slate-500">Section:</span>
                <button
                  type="button"
                  onClick={() => setSection("")}
                  className={`${SEC} ${section === "" ? SEC_ON : SEC_OFF}`}
                >
                  All
                </button>
                {sectionOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={`${SEC} ${section === s ? SEC_ON : SEC_OFF}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Summary — what will be changed, for whom */}
        {rows.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Changing <span className="font-semibold">{fieldInfo.label}</span> for {targetText} ·{" "}
              <span className="font-semibold">{rows.length}</span> student(s)
            </span>
          </div>
        )}
      </div>

      {/* ── Nothing chosen yet ── */}
      {!hasPicker && (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Filter className="h-8 w-8" />
          Choose a class or search to pick students
        </div>
      )}

      {/* ── Chips ── */}
      {hasPicker && (
        <div
          className="rounded-xl border border-slate-200 shadow-sm dark:border-slate-800"
          style={{ backgroundColor: tableBg }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4" /> {rows.length} student(s) selected
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </span>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button type="button" tabIndex={-1} onClick={selectAll} className="inline-flex items-center gap-1 cursor-pointer hover:text-sky-600">
                <CheckCheck className="h-4 w-4" /> Select all
              </button>
              <button type="button" tabIndex={-1} onClick={clearAll} className="inline-flex items-center gap-1 cursor-pointer hover:text-rose-600">
                <X className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>
          <div className="flex max-h-64 flex-wrap gap-1.5 overflow-auto p-3">
            {pool.length === 0 && !loading && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {by === "search" ? "Search and pick students from any class." : "No students found."}
              </span>
            )}
            {pool.map((s) => {
              const id = String(s._id);
              const on = selected.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => toggle(id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border py-0.5 pl-2.5 pr-1 text-xs transition-colors cursor-pointer ${
                    on
                      ? "border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40"
                  }`}
                >
                  {s.fullName}
                  <span className={on ? "text-sky-500 dark:text-sky-400/80" : "text-slate-400 dark:text-slate-500"}>
                    ({s.classId?.name || "—"}-{s.section || ""})
                  </span>
                  <span
                    className={`rounded px-1.5 font-mono text-[11px] ${
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
        </div>
      )}

      {/* ── Table ── */}
      {rows.length > 0 && (
         <div
          className="rounded-xl border border-slate-200 shadow-sm dark:border-slate-800"
          style={{ backgroundColor: tableBg }}
        >
          {/* Apply to all + Save */}
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              {isBForm ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Each student needs their own B-Form number (13 digits).
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Set same new {fieldInfo.short} for all:</span>
                  {isDate && (
                    <input
                      value={allValue.value}
                      onChange={(e) => setAllValue({ value: maskDmy(e.target.value) })}
                      placeholder="dd-mm-yyyy"
                      tabIndex={-1}
                      className={`${CELL_INPUT} w-28 border-slate-200 dark:border-slate-700`}
                    />
                  )}
                  {field === "section" && (
                    <select
                      value={allValue.value}
                      onChange={(e) => setAllValue({ value: e.target.value })}
                      tabIndex={-1}
                      className={`${CELL_INPUT} border-slate-200 dark:border-slate-700`}
                    >
                      <option value="">Section…</option>
                      {allSections.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                  {field === "classId" && (
                    <>
                      <select
                        value={allValue.value}
                        onChange={(e) => {
                          const secs = sectionNames(classById.get(e.target.value));
                          setAllValue({ value: e.target.value, section: secs.length === 1 ? secs[0] : "" });
                        }}
                        tabIndex={-1}
                        className={`${CELL_INPUT} border-slate-200 dark:border-slate-700`}
                      >
                        <option value="">Class…</option>
                        {classes.map((c) => (
                          <option key={c._id} value={String(c._id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={allValue.section || ""}
                        onChange={(e) => setAllValue((p) => ({ ...p, section: e.target.value }))}
                        disabled={!allValue.value}
                        tabIndex={-1}
                        className={`${CELL_INPUT} border-slate-200 dark:border-slate-700`}
                      >
                        <option value="">Section…</option>
                        {sectionNames(classById.get(allValue.value)).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={applyAll}
                    className="h-8 rounded-md border border-slate-200 px-3 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Apply to all
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving || !changedCount}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-100 px-4 text-xs font-semibold text-sky-700 hover:bg-sky-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes ({changedCount})
              </button>
            </div>
          )}

          {saveErrors.length > 0 && (
            <div className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="mb-1 font-semibold">Nothing was saved. Please fix:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {saveErrors.slice(0, 15).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {saveErrors.length > 15 && <li>…and {saveErrors.length - 15} more</li>}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-2 font-semibold">S#</th>
                  <th className="px-3 py-2 font-semibold">Student Name</th>
                  <th className="px-3 py-2 font-semibold">Class (Section)</th>
                  <th className="px-3 py-2 font-semibold">Father Name</th>
                  <th className="px-3 py-2 font-semibold">Contact#</th>
                  <th className="px-3 py-2 font-semibold">Current {fieldInfo.short}</th>
                  <th className="px-3 py-2 font-semibold">New {fieldInfo.short}</th>
                </tr>
              </thead>
              <tbody ref={bodyRef}>
                {rows.map((s, i) => {
                  const id = String(s._id);
                  const e = edits[id];
                  const changed = isChanged(s);
                  const invalid = isInvalid(s);
                  const cur = currentText(s);
                  const border = invalid
                    ? "border-rose-400 dark:border-rose-500/60"
                    : changed
                      ? "border-amber-400 dark:border-amber-500/60"
                      : "border-slate-200 dark:border-slate-700";
                  return (
                    <tr
                      key={id}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        invalid ? "bg-rose-50 dark:bg-rose-500/10" : changed ? "bg-amber-50 dark:bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-slate-400">({s.grNumber}) </span>
                        <span className="text-sky-700 dark:text-sky-400">{s.fullName}</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">
                        {s.classId?.name || "—"} <span className="text-pink-600 dark:text-pink-400">({s.section || ""})</span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{s.parentId?.fullName || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">
                        {s.parentId?.phone || s.motherPhone || "—"}
                      </td>
                      <td
                        className={`px-3 py-1.5 ${isBForm ? "font-mono" : ""} ${
                          changed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {cur || <span className="text-slate-400 no-underline">— not set —</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {isDate && (
                          <input
                            data-nav={`${i}-0`}
                            value={e?.value || ""}
                            onChange={(ev) => setEdit(id, { value: maskDmy(ev.target.value) })}
                            onKeyDown={(ev) => onEnter(ev, i, 0)}
                            placeholder="dd-mm-yyyy"
                            inputMode="numeric"
                            disabled={!canEdit}
                            className={`${CELL_INPUT} w-28 ${border}`}
                          />
                        )}
                        {isBForm && (
                          <input
                            data-nav={`${i}-0`}
                            value={e?.value || ""}
                            onChange={(ev) => setEdit(id, { value: maskBForm(ev.target.value) })}
                            onKeyDown={(ev) => onEnter(ev, i, 0)}
                            placeholder="12345-1234567-1"
                            inputMode="numeric"
                            disabled={!canEdit}
                            className={`${CELL_INPUT} w-36 font-mono ${border}`}
                          />
                        )}
                        {field === "section" && (
                          <select
                            data-nav={`${i}-0`}
                            value={e?.value || ""}
                            onChange={(ev) => setEdit(id, { value: ev.target.value })}
                            onKeyDown={(ev) => onEnter(ev, i, 0)}
                            disabled={!canEdit}
                            className={`${CELL_INPUT} ${border}`}
                          >
                            <option value="">—</option>
                            {sectionNames(classById.get(String(s.classId?._id))).map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        )}
                        {field === "classId" && (
                          <div className="flex gap-1.5">
                            <select
                              data-nav={`${i}-0`}
                              value={e?.value || ""}
                              onChange={(ev) => {
                                const secs = sectionNames(classById.get(ev.target.value));
                                setEdit(id, { value: ev.target.value, section: secs.length === 1 ? secs[0] : "" });
                              }}
                              onKeyDown={(ev) => onEnter(ev, i, 0)}
                              disabled={!canEdit}
                              className={`${CELL_INPUT} ${border}`}
                            >
                              <option value="">Class…</option>
                              {classes.map((c) => (
                                <option key={c._id} value={String(c._id)}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <select
                              data-nav={`${i}-1`}
                              value={e?.section || ""}
                              onChange={(ev) => setEdit(id, { section: ev.target.value })}
                              onKeyDown={(ev) => onEnter(ev, i, 1)}
                              disabled={!canEdit || !e?.value}
                              className={`${CELL_INPUT} ${border}`}
                            >
                              <option value="">Section…</option>
                              {sectionNames(classById.get(e?.value || "")).map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500">
            Highlighted rows have a new value; only these are saved. Tab or Enter moves to the next row.
          </p>
        </div>
      )}
    </div>
  );
}

// Guard: page opens only with "Students Bulk Info Change → View"
export default function Page() {
  return (
    <PageGuard module="bulkInfo">
      <BulkInfoPage />
    </PageGuard>
  );
}