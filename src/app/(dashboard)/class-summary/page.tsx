"use client";

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { ClipboardList, Users, Mars, Venus, School } from "lucide-react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import PageHeader from "@/components/PageHeader";
import PageGuard from "@/components/PageGuard";
import ExportButtons from "@/components/ExportButtons";
import { type ExportHeader } from "@/lib/exportUtils";
import { notify } from "@/lib/notify";
import { getSubdomain } from "@/lib/host";

type Sec = { name: string; boys: number; girls: number; total: number; inactive: number };

type Row = {
  key: string;
  sno: number;
  className: string;
  sections: Sec[];
};

// Class sections can be strings or objects
const sectionNames = (cls: any): string[] =>
  (cls?.sections || [])
    .map((s: any) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean);

// "Male" / "male" / "boy" → boys, "Female" / "girl" → girls
const genderOf = (g: string): "boys" | "girls" | "other" => {
  const v = String(g || "").toLowerCase();
  if (v.startsWith("f") || v === "girl") return "girls";
  if (v.startsWith("m") || v === "boy") return "boys";
  return "other";
};

const LINE = "flex h-6 items-center"; // one line per section (keeps columns aligned)
const ZERO = "text-slate-300 dark:text-slate-600";

// Boys / girls split bar
function RatioBar({ b, g }: { b: number; g: number }) {
  const t = b + g;
  return (
    <div
      className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      title={t ? `Boys ${Math.round((b / t) * 100)}% · Girls ${Math.round((g / t) * 100)}%` : "No students"}
    >
      {t > 0 && (
        <>
          <div className="bg-cyan-500 dark:bg-cyan-400" style={{ width: `${(b / t) * 100}%` }} />
          <div className="bg-pink-500 dark:bg-pink-400" style={{ width: `${(g / t) * 100}%` }} />
        </>
      )}
    </div>
  );
}

// Summary card at the top
function StatCard({
  icon,
  label,
  value,
  sub,
  box,
  iconBox,
  labelCls,
  valueCls,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  box: string;
  iconBox: string;
  labelCls: string;
  valueCls: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${box}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBox}`}>{icon}</div>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${labelCls}`}>{label}</p>
        <p className={`text-xl font-bold tabular-nums ${valueCls}`}>
          {value}
          {sub != null && <span className="ml-1.5 text-xs font-medium">{sub}</span>}
        </p>
      </div>
    </div>
  );
}

function ClassSummaryPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const schoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const [classes, setClasses] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

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

  // School info for the export header
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/superadmin/schools?id=${schoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchoolInfo(d))
      .catch(() => {});
  }, [schoolId]);

  // Classes + counts (active + inactive) in one call
  const loadCounts = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/classes-summary?schoolId=${schoolId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(data?.message || "Failed to load class summary");
        return;
      }
      setClasses(Array.isArray(data?.classes) ? data.classes : []);
      setCounts(Array.isArray(data?.rows) ? data.rows : []);
    } catch {
      notify.error("Failed to load class summary");
    } finally {
      setLoaded(true);
    }
  }, [schoolId]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // One row per class (its sections stacked inside)
  const { rows, totals } = useMemo(() => {
    type V = { boys: number; girls: number; other: number; inactive: number };
    const empty = (): V => ({ boys: 0, girls: 0, other: 0, inactive: 0 });

    const map = new Map<string, V>();
    for (const c of counts) {
      const k = `${c.classId}|${c.section}`;
      const v = map.get(k) || empty();
      if (c.status === "inactive") v.inactive += c.count;
      else v[genderOf(c.gender)] += c.count; // Boys / Girls = active only
      map.set(k, v);
    }

    const sum = empty();
    const used = new Set<string>();
    const toSec = (name: string, v: V): Sec => {
      sum.boys += v.boys;
      sum.girls += v.girls;
      sum.other += v.other;
      sum.inactive += v.inactive;
      return { name, boys: v.boys, girls: v.girls, total: v.boys + v.girls + v.other, inactive: v.inactive };
    };

    const list: Row[] = [];
    let sectionCount = 0;
    const sorted = [...classes].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const c of sorted) {
      const id = String(c._id);
      const secs = sectionNames(c);
      sectionCount += secs.length;
      // Students in a section that no longer exists on the class
      const extra = counts
        .filter((x) => x.classId === id && !secs.includes(x.section))
        .map((x) => x.section)
        .filter((s, i, arr) => arr.indexOf(s) === i);
      const names = [...secs, ...extra];

      const sections = (names.length ? names : [""]).map((name) => {
        const k = `${id}|${name}`;
        used.add(k);
        return toSec(name || "—", map.get(k) || empty());
      });
      list.push({ key: id, sno: list.length + 1, className: c.name, sections });
    }

    // Students whose class was deleted
    const left = empty();
    let hasLeft = false;
    for (const [k, v] of map) {
      if (used.has(k)) continue;
      hasLeft = true;
      left.boys += v.boys;
      left.girls += v.girls;
      left.other += v.other;
      left.inactive += v.inactive;
    }
    if (hasLeft) {
      list.push({ key: "no-class", sno: list.length + 1, className: "No class", sections: [toSec("—", left)] });
    }

    const all = sum.boys + sum.girls + sum.other;
    return {
      rows: list,
      totals: { ...sum, all, classCount: classes.length, sectionCount },
    };
  }, [classes, counts]);

  const pct = (v: number) => (totals.all ? `${Math.round((v / totals.all) * 100)}%` : "0%");

  const exportHeader: ExportHeader = {
    school: {
      name: schoolInfo?.name,
      address: schoolInfo?.address,
      logo: schoolInfo?.logo,
    },
    info: [
      { label: "Boys", value: totals.boys },
      { label: "Girls", value: totals.girls },
      { label: "Total (Active)", value: totals.all },
      { label: "Inactive", value: totals.inactive },
    ],
  };

  // Stacked numbers: one line per section, 0 shown as "–"
  const stack = (row: Row, field: "boys" | "girls" | "total", cls = "") => (
    <div className="flex flex-col">
      {row.sections.map((s, i) => {
        const v = s[field];
        return (
          <span key={i} className={`${LINE} justify-center tabular-nums ${v === 0 ? ZERO : cls}`}>
            {v === 0 ? "–" : v}
          </span>
        );
      })}
    </div>
  );

  // Export: sections on separate lines inside one cell
  const joined = (field: keyof Sec) => (row: Row) => row.sections.map((s) => s[field]).join("\n");

  const columns = useMemo<MRT_ColumnDef<Row>[]>(
    () => [
      {
        // Same id as the Classes page → the export helper adds its own S#
        id: "S#",
        header: "S.No",
        size: 60,
        enableHiding: false,
        Cell: ({ row }) => (
          <span className={`${LINE} text-slate-400 dark:text-slate-500`}>{row.original.sno}</span>
        ),
      },
      {
        accessorKey: "className",
        header: "Class",
        size: 160,
        enableHiding: false,
        Cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-col">
              <span className={`${LINE} font-semibold text-slate-800 dark:text-slate-100`}>{r.className}</span>
              {r.sections.length > 1 && (
                <span className="text-[11px] font-medium text-orange-500 dark:text-orange-400">
                  {r.sections.length} sections · {r.sections.reduce((a, s) => a + s.total, 0)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "section",
        header: "Section",
        size: 130,
        accessorFn: (r) => r.sections.map((s) => s.name).join(", "),
        meta: { getExportValue: joined("name") },
        Cell: ({ row }) => (
          <div className="flex flex-col">
            {row.original.sections.map((s, i) => (
              <span key={i} className={LINE}>
                {s.name === "—" ? (
                  <span className={ZERO}>—</span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-sky-100 px-2 py-px text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {s.name}
                  </span>
                )}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "boys",
        header: "Boys",
        size: 80,
        enableGlobalFilter: false,
        accessorFn: (r) => r.sections.reduce((a, s) => a + s.boys, 0),
        meta: { getExportValue: joined("boys") },
        muiTableHeadCellProps: { align: "center" },
        Cell: ({ row }) => stack(row.original, "boys", "text-slate-700 dark:text-slate-200"),
      },
      {
        id: "girls",
        header: "Girls",
        size: 80,
        enableGlobalFilter: false,
        accessorFn: (r) => r.sections.reduce((a, s) => a + s.girls, 0),
        meta: { getExportValue: joined("girls") },
        muiTableHeadCellProps: { align: "center" },
        Cell: ({ row }) => stack(row.original, "girls", "text-slate-700 dark:text-slate-200"),
      },
      {
        id: "total",
        header: "Total",
        size: 80,
        enableGlobalFilter: false,
        accessorFn: (r) => r.sections.reduce((a, s) => a + s.total, 0),
        meta: { getExportValue: joined("total") },
        muiTableHeadCellProps: { align: "center" },
        Cell: ({ row }) => stack(row.original, "total", "font-semibold text-slate-900 dark:text-slate-50"),
      },
      {
        id: "ratio",
        header: "Ratio",
        size: 130,
        enableGlobalFilter: false,
        accessorFn: (r) => r.sections.reduce((a, s) => a + s.boys, 0),
        meta: {
          getExportValue: (row: Row) =>
            row.sections
              .map((s) => {
                const t = s.boys + s.girls;
                return t ? `${Math.round((s.boys / t) * 100)}% / ${Math.round((s.girls / t) * 100)}%` : "-";
              })
              .join("\n"),
        },
        Cell: ({ row }) => (
          <div className="flex flex-col">
            {row.original.sections.map((s, i) => (
              <span key={i} className={LINE}>
                <RatioBar b={s.boys} g={s.girls} />
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "inactive",
        header: "Inactive",
        size: 80,
        enableGlobalFilter: false,
        accessorFn: (r) => r.sections.reduce((a, s) => a + s.inactive, 0),
        meta: { getExportValue: joined("inactive") },
        muiTableHeadCellProps: { align: "center" },
        Cell: ({ row }) => (
          <div className="flex flex-col">
            {row.original.sections.map((s, i) => (
              <span key={i} className={`${LINE} justify-center`}>
                {s.inactive > 0 ? (
                  <span className="rounded-full bg-rose-50 px-2 text-[11px] font-semibold tabular-nums text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
                    {s.inactive}
                  </span>
                ) : (
                  <span className={ZERO}>–</span>
                )}
              </span>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    getRowId: (r) => r.key,
    state: { isLoading: !loaded },
    enablePagination: false,
    enableBottomToolbar: false,
    enableSorting: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    enableHiding: true,
    enableDensityToggle: false,
    enableKeyboardShortcuts: false,
    initialState: { density: "compact" },
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex flex-wrap items-center gap-2">
        <ExportButtons table={table} module="classSummary" title="Classes Summary" header={exportHeader} />
      </div>
    ),
    // Classes with more than one section get a light grey row
    muiTableBodyRowProps: ({ row }) => ({
      sx:
        (row.original.sections?.length ?? 0) > 1
          ? { "& td": { backgroundColor: "rgba(148,163,184,0.08)" } }
          : {},
    }),
        muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: 0,
        border: "none",
        backgroundColor: "transparent",
        padding: "0px 10px",
      },
    },
    muiTableProps: { sx: { tableLayout: "fixed" } },
    muiTableHeadCellProps: { sx: { fontWeight: "700", fontSize: "12px" } },
    muiTableBodyCellProps: {
      sx: { fontSize: "13px", fontWeight: "500", color: "var(--foreground)", verticalAlign: "top", py: 1 },
    },
  });

  const show = (v: number) => (loaded ? v : "–");

  return (
    <div className="space-y-3">
      <PageHeader title="Classes Summary" icon={<ClipboardList className="w-4 h-4" />} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Students"
          value={show(totals.all)}
          box="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          iconBox="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
          labelCls="text-slate-500 dark:text-slate-400"
          valueCls="text-slate-800 dark:text-slate-100"
        />
        <StatCard
          icon={<Mars className="h-5 w-5" />}
          label="Boys"
          value={show(totals.boys)}
          sub={loaded ? pct(totals.boys) : undefined}
          box="border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
          iconBox="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"
          labelCls="text-sky-700 dark:text-sky-300"
          valueCls="text-sky-800 dark:text-sky-200"
        />
        <StatCard
          icon={<Venus className="h-5 w-5" />}
          label="Girls"
          value={show(totals.girls)}
          sub={loaded ? pct(totals.girls) : undefined}
          box="border-pink-200 bg-pink-50 dark:border-pink-500/30 dark:bg-pink-500/10"
          iconBox="bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300"
          labelCls="text-pink-700 dark:text-pink-300"
          valueCls="text-pink-800 dark:text-pink-200"
        />
        <StatCard
          icon={<School className="h-5 w-5" />}
          label="Classes / Sections"
          value={show(totals.classCount)}
          sub={loaded ? `/ ${totals.sectionCount}` : undefined}
          box="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          iconBox="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          labelCls="text-slate-500 dark:text-slate-400"
          valueCls="text-slate-800 dark:text-slate-100"
        />
      </div>

       <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <MaterialReactTable table={table} />
      </div>

      {loaded && totals.other > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Note: {totals.other} active student(s) have no gender set. They are counted in Total, not in Boys or Girls.
        </p>
      )}
    </div>
  );
}

// Guard: uses the "Class Summary" permission (View / Export)
export default function Page() {
  return (
    <PageGuard module="classSummary">
      <ClassSummaryPage />
    </PageGuard>
  );
}