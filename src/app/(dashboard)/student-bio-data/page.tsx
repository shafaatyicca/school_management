"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  BookUser,
  Printer,
  CheckCheck,
  X,
  Search,
  Users,
  Filter,
} from "lucide-react";
import { TextField } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import StudentSearchBox, { StudentOption } from "@/components/StudentSearchBox";
import { notify } from "@/lib/notify";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";
import { printBioData } from "@/lib/printFeeVoucher";

const SEARCH_MODE = "__search__";
const ALL = "all";
type StatusFilter = "active" | "inactive" | "all";

export default function StudentBioDataPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const [school, setSchool] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  // "" = nothing, SEARCH_MODE = search, "all" = all classes, otherwise classId
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
    const host = window.location.hostname;
    if (host.includes(".lvh.me") || host.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${host.split(".")[0]}`)
        .then((r) => r.json())
        .then((d) => d?._id && setViewSchoolId(d._id));
    }
  }, [isSuperAdmin]);

  // School, settings, classes
  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      fetch(`/api/superadmin/schools?id=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()),
    ])
      .then(([sch, set, cls]) => {
        setSchool(sch);
        setSettings(set);
        setFormStyle(set?.admission?.formStyle === "style2" ? "style2" : "style1");
        setClasses(Array.isArray(cls) ? cls : []);
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
      const data = await res.json();
      printBioData(Array.isArray(data) ? data : [], opts);
    } catch {
      notify.error("Failed to load student details");
    } finally {
      setPrinting(false);
    }
  };

  const STATUS_BUTTONS: { key: StatusFilter; label: string; count: number; active: string }[] = [
    { key: "active", label: "Active", count: counts.active, active: "bg-emerald-600 border-emerald-600 text-white" },
    { key: "inactive", label: "Inactive", count: counts.inactive, active: "bg-rose-600 border-rose-600 text-white" },
    {
      key: "all",
      label: "All",
      count: counts.all,
      active:
        "bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-900",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Student Bio Data" icon={<BookUser className="w-4 h-4" />} />

      {/* ── Filters ── */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <TextField
            select
            label="Select By"
            size="small"
            value={mode}
            onChange={(e) => changeMode(e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 230 }}
          >
            <option value="">Choose a class or search</option>
            <option value={SEARCH_MODE}>Search Students</option>
            <option value={ALL}>All Classes</option>
            <optgroup label="Classes">
              {classes.map((c) => (
                <option key={c._id} value={String(c._id)}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </TextField>

          {selectedClass && (
            <TextField
              select
              label="Section"
              size="small"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            >
              <option value={ALL}>All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </TextField>
          )}

          {isSearchMode && (
            <div className="flex-1 min-w-[260px]">
              <StudentSearchBox
                schoolId={schoolId}
                onSelect={addPicked}
                clearOnSelect
                showSearchButton={false}
                variant="page"
                placeholder="Type a student name or GR # and pick a student"
              />
            </div>
          )}

          <TextField
            select
            label="Form"
            size="small"
            value={formStyle}
            onChange={(e) => setFormStyle(e.target.value as "style1" | "style2")}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 120, ml: { sm: "auto" } }}
          >
            <option value="style1">Form Style Classic</option>
            <option value="style2">Form Style Modern</option>
          </TextField>
        </div>

        {/* Status buttons (class / all classes) */}
        {mode && !isSearchMode && (
          <div className="flex flex-wrap items-center gap-2">
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
                    className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : ""}`}
                    style={on ? undefined : { backgroundColor: "var(--muted)" }}
                  >
                    {b.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Students ── */}
      {!mode ? (
        <div
          className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <Filter className="h-8 w-8" />
          Choose a class or &quot;Search Students&quot; to begin
        </div>
      ) : (
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
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
              <Button
                onClick={handlePrint}
                disabled={targetCount === 0 || printing || !school}
                className="h-8 ml-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                {printing ? "Preparing..." : `Print Bio Data (${targetCount})`}
              </Button>
            </div>
          </div>

          {/* Chips */}
          <div className="max-h-80 overflow-y-auto p-4">
            {isSearchMode ? (
              picked.length === 0 ? (
                <p
                  className="flex items-center justify-center gap-1.5 py-8 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Search className="w-3.5 h-3.5" /> Search and pick students from any class.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-600 bg-sky-600 px-2 py-1 text-[11px] font-medium text-white"
                    >
                      {s.fullName}
                      <span className="text-sky-100">
                        ({s.className}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span className="rounded bg-sky-700 px-1 font-mono text-[10px]">{s.grNumber}</span>
                      <button
                        type="button"
                        onClick={() => setPicked((prev) => prev.filter((p) => p._id !== s._id))}
                        className="rounded hover:bg-sky-700 cursor-pointer"
                        aria-label={`Remove ${s.fullName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )
            ) : loading ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
                Loading students...
              </p>
            ) : visibleStudents.length === 0 ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
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
                          ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
                          : "text-foreground hover:border-sky-400"
                      }`}
                      style={on ? undefined : { borderColor: "var(--border)", backgroundColor: "var(--card)" }}
                    >
                      {s.fullName}
                      <span
                        className={on ? "text-sky-100" : ""}
                        style={on ? undefined : { color: "var(--muted-foreground)" }}
                      >
                        ({s.classId?.name}
                        {s.section ? `-${s.section}` : ""})
                      </span>
                      <span
                        className={`rounded px-1 font-mono text-[10px] ${on ? "bg-sky-700 text-white" : ""}`}
                        style={on ? undefined : { backgroundColor: "var(--muted)" }}
                      >
                        {s.grNumber}
                      </span>
                      {s.status === "inactive" && (
                        <span className="rounded bg-rose-500 px-1 text-[9px] font-bold text-white">
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