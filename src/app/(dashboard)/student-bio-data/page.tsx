"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTheme, lighten } from "@mui/material/styles";
import {
  BookUser,
  Printer,
  CheckCheck,
  X,
  Search,
  Users,
  Filter,
  Lock,
  School,
  Building2,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageGuard from "@/components/PageGuard";
import { usePermissions } from "@/components/PermissionsProvider";
import { Button } from "@/components/ui/button";
import StudentSearchBox, { StudentOption } from "@/components/StudentSearchBox";
import { notify } from "@/lib/notify";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";
import { printBioData } from "@/lib/printFeeVoucher";
import { getSubdomain } from "@/lib/host";

const SEARCH_MODE = "__search__";
const ALL = "all";
type StatusFilter = "active" | "inactive" | "all";

// Tabs: Class / All classes / Search
type Tab = "class" | "all" | "search";
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "class", label: "Select One Class", icon: School },
  { key: "all", label: "Select All classes", icon: Building2 },
  { key: "search", label: "Search From All School", icon: Search },
];

// Filter styles (same light look as the Bulk Info page)
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

// Makes the StudentSearchBox input match the other boxes
const SEARCH_LOOK = [
  "[&_input]:!h-9 [&_input]:!rounded-lg [&_input]:!border [&_input]:!text-sm",
  "[&_input]:!bg-white [&_input]:!text-slate-700 [&_input]:!border-slate-200",
  "dark:[&_input]:!bg-slate-900 dark:[&_input]:!text-slate-200 dark:[&_input]:!border-slate-700",
  "[&_input]:focus:!border-sky-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-sky-100 dark:[&_input]:focus:!ring-sky-500/20",
].join(" ");

function StudentBioDataPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  // Same background as the MRT tables (Classes, Students…): MUI theme colour
  const muiTheme = useTheme();
  const tableBg =
    muiTheme.palette.mode === "dark"
      ? lighten(muiTheme.palette.background.default, 0.05)
      : muiTheme.palette.background.default;

  // Print → "Student Bio Data → Export/Print"
  const { can } = usePermissions();
  const canPrint = can("bioData", "export");

  const [school, setSchool] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Tab + mode ("" = nothing, SEARCH_MODE = search, "all" = all classes, otherwise classId)
  const [tab, setTab] = useState<Tab>("class");
  const [mode, setMode] = useState("");
  const [section, setSection] = useState(ALL);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [formStyle, setFormStyle] = useState<"style1" | "style2">("style1");

  // Class / all-classes mode
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Search mode
  const [picked, setPicked] = useState<StudentOption[]>([]);
  const [printing, setPrinting] = useState(false);

  const isSearchMode = mode === SEARCH_MODE;
  const isAllClasses = mode === ALL;
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

  // Classes — loaded on their own so the chips are ready quickly
  useEffect(() => {
    if (!schoolId) return;
    setClassesLoading(true);
    fetch(`/api/classes?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((cls) => setClasses(Array.isArray(cls) ? cls : []))
      .catch(() => notify.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, [schoolId]);

  // School details + settings (needed only when printing — full record for logo/address)
  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      fetch(`/api/superadmin/schools?id=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sch, set]) => {
        setSchool(sch);
        setSettings(set);
        setFormStyle(set?.admission?.formStyle === "style2" ? "style2" : "style1");
      })
      .catch(() => notify.error("Failed to load school details"));
  }, [schoolId]);

  // Load students for class / all classes
  useEffect(() => {
    if (!schoolId || !mode || isSearchMode) {
      setStudents([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ schoolId: String(schoolId) });
    if (!isAllClasses) {
      params.set("classId", mode);
      if (section !== ALL) params.set("section", section);
    }
    fetch(`/api/students?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStudents(list);
        setSelected(new Set(list.map((s: any) => String(s._id)))); // all selected by default
      })
      .catch(() => notify.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, [schoolId, mode, section, isSearchMode, isAllClasses]);

  // ── Derived ──
  const sections: string[] = (selectedClass?.sections || [])
    .map((s: any) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean);

  const counts = useMemo(
    () => ({
      active: students.filter((s) => s.status === "active").length,
      inactive: students.filter((s) => s.status === "inactive").length,
      all: students.length,
    }),
    [students],
  );

  const visibleStudents = useMemo(
    () => (status === "all" ? students : students.filter((s) => s.status === status)),
    [students, status],
  );

  const targetCount = isSearchMode
    ? picked.length
    : visibleStudents.filter((s) => selected.has(String(s._id))).length;

  // ── Actions ──
  const changeMode = (value: string) => {
    setMode(value);
    setSection(ALL);
    setStatus("active");
    setPicked([]);
  };

  // Tab: Class → wait for a class chip, All classes → load all, Search → search box
  const changeTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    changeMode(t === "search" ? SEARCH_MODE : t === "all" ? ALL : "");
  };

  // Class chip: choose, or click again to clear
  const pickClass = (id: string) => changeMode(mode === id ? "" : id);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addPicked = (s: StudentOption) => {
    if (picked.some((p) => p._id === s._id)) {
      notify.error(`${s.fullName} is already added`);
      return;
    }
    setPicked((prev) => (prev.some((p) => p._id === s._id) ? prev : [...prev, s]));
  };

  const handlePrint = async () => {
    if (!canPrint) return;

    const opts = {
      school: {
        name: school?.name,
        address: school?.address,
        logo: school?.logo,
        phone: school?.phone,
      },
      undertaking: settings?.admission?.undertaking || DEFAULT_UNDERTAKING,
      style: formStyle,
    };

    if (!isSearchMode) {
      printBioData(
        visibleStudents.filter((s) => selected.has(String(s._id))),
        opts,
      );
      return;
    }

    // Search mode: fetch the full records of the picked students
    setPrinting(true);
    try {
      const ids = picked.map((p) => p._id).join(",");
      const res = await fetch(`/api/students?schoolId=${schoolId}&ids=${ids}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(data?.message || "Failed to load student details");
        return;
      }
      printBioData(Array.isArray(data) ? data : [], opts);
    } catch {
      notify.error("Failed to load student details");
    } finally {
      setPrinting(false);
    }
  };

  const STATUS_BUTTONS: { key: StatusFilter; label: string; count: number; active: string }[] = [
    {
      key: "active",
      label: "Active",
      count: counts.active,
      active:
        "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300",
    },
    {
      key: "inactive",
      label: "Inactive",
      count: counts.inactive,
      active:
        "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-300",
    },
    {
      key: "all",
      label: "All",
      count: counts.all,
      active:
        "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-500/20 dark:border-slate-500/40 dark:text-slate-200",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Student Bio Data" icon={<BookUser className="w-4 h-4" />} />

      {/* ── Filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Row 1: tabs + search box (Search tab) + form style */}
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

          {/* Form style */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Select Form Design:</span>
            <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(
                [
                  { key: "style1", label: "Classic" },
                  { key: "style2", label: "Modern" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormStyle(f.key)}
                  className={`${TAB} h-7 ${formStyle === f.key ? TAB_ON : TAB_OFF}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
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

        {/* Row 3: section chips + status (class / all classes) */}
        {mode && !isSearchMode && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
            {selectedClass && (
              <>
                <span className="mr-1 text-[11px] text-slate-400 dark:text-slate-500">Section:</span>
                <button
                  type="button"
                  onClick={() => setSection(ALL)}
                  className={`${SEC} ${section === ALL ? SEC_ON : SEC_OFF}`}
                >
                  All
                </button>
                {sections.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={`${SEC} ${section === s ? SEC_ON : SEC_OFF}`}
                  >
                    {s}
                  </button>
                ))}
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              {STATUS_BUTTONS.map((b) => {
                const on = status === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setStatus(b.key)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 h-8 text-xs font-semibold transition-colors cursor-pointer ${
                      on ? b.active : "text-foreground hover:bg-[color:var(--muted)]"
                    }`}
                    style={on ? undefined : { borderColor: "var(--border)" }}
                  >
                    {b.label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-black/10 dark:bg-white/15" : ""}`}
                      style={on ? undefined : { backgroundColor: "var(--muted)" }}
                    >
                      {b.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Students ── */}
      {!mode ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Filter className="h-8 w-8" />
          Choose a class or search to begin
        </div>
      ) : (
        <div
          className="rounded-xl border border-slate-200 shadow-sm dark:border-slate-800"
          style={{ backgroundColor: tableBg }}
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Users className="w-3.5 h-3.5" /> {targetCount} student(s) selected
            </span>
            <div className="flex items-center gap-1">
              {isSearchMode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicked([])}
                  disabled={picked.length === 0}
                  className="h-7 text-[11px] font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Remove all
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelected(
                        (prev) => new Set([...prev, ...visibleStudents.map((s) => String(s._id))]),
                      )
                    }
                    className="h-7 text-[11px] font-semibold cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" /> Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        visibleStudents.forEach((s) => next.delete(String(s._id)));
                        return next;
                      })
                    }
                    className="h-7 text-[11px] font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                </>
              )}

              {canPrint ? (
                <Button
                  onClick={handlePrint}
                  disabled={targetCount === 0 || printing || !school}
                  className="h-8 ml-2 border border-sky-300 bg-sky-100 px-4 text-xs font-semibold text-sky-700 shadow-none hover:bg-sky-200 cursor-pointer dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  {printing ? "Preparing..." : `Print Bio Data (${targetCount})`}
                </Button>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  <Lock className="w-3.5 h-3.5" /> No print permission
                </span>
              )}
            </div>
          </div>

          {/* Chips */}
          <div className="max-h-80 overflow-y-auto p-4">
            {isSearchMode ? (
              picked.length === 0 ? (
                <p className="flex items-center justify-center gap-1.5 py-8 text-xs text-slate-400 dark:text-slate-500">
                  <Search className="w-3.5 h-3.5" /> Search and pick students from any class.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300"
                    >
                      {s.fullName}
                      <span className="text-sky-500 dark:text-sky-400/80">
                        ({s.className}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span className="rounded bg-sky-200 px-1 font-mono text-[10px] text-sky-800 dark:bg-sky-500/30 dark:text-sky-200">
                        {s.grNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPicked((prev) => prev.filter((p) => p._id !== s._id))}
                        className="rounded hover:bg-sky-200 cursor-pointer dark:hover:bg-sky-500/30"
                        aria-label={`Remove ${s.fullName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )
            ) : loading ? (
              <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">Loading students...</p>
            ) : visibleStudents.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No {status !== "all" ? status : ""} students found.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleStudents.map((s) => {
                  const id = String(s._id);
                  const on = selected.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        on
                          ? "border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40"
                      }`}
                    >
                      {s.fullName}
                      <span className={on ? "text-sky-500 dark:text-sky-400/80" : "text-slate-400 dark:text-slate-500"}>
                        ({s.classId?.name}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span
                        className={`rounded px-1 font-mono text-[10px] ${
                          on
                            ? "bg-sky-200 text-sky-800 dark:bg-sky-500/30 dark:text-sky-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {s.grNumber}
                      </span>
                      {s.status === "inactive" && (
                        <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                          INACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Guard: page opens only with "Student Bio Data → View"
export default function Page() {
  return (
    <PageGuard module="bioData">
      <StudentBioDataPage />
    </PageGuard>
  );
}