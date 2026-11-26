"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { type ExportHeader } from "@/lib/exportUtils";
import { Pencil, Trash2, Search, UserX, Filter, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageGuard from "@/components/PageGuard";
import ExportButtons from "@/components/ExportButtons";
import { usePermissions } from "@/components/PermissionsProvider";
import { Button } from "@/components/ui/button";
import { useParentModal } from "@/hooks/useParentModal";
import ParentFormModal from "@/components/ParentFormModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import { getSubdomain } from "@/lib/host";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";

// Chip choices (everything else = a class id)
const MODE_ALL = "__all";
const MODE_ORPHAN = "__orphan";

const sectionNames = (cls: any): string[] =>
  (cls?.sections || []).map((s: any) => (typeof s === "string" ? s : s?.name)).filter(Boolean);

// Chip styles
const CHIP =
  "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer";
const CHIP_OFF =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10";
const CHIP_ON = "border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500";
const SEC = "inline-flex h-6 items-center rounded-full px-3 text-[11px] font-medium transition-colors cursor-pointer";
const SEC_OFF =
  "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
const SEC_ON = "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";

function ParentsPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  const { can } = usePermissions();
  const canCreate = can("parents", "create");
  const canEdit = can("parents", "edit");
  const canDelete = can("parents", "delete");

  const [parents, setParents] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [parentToDelete, setParentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Filters
  const [classes, setClasses] = useState<any[]>([]);
  const [mode, setMode] = useState(""); // "" | MODE_ALL | MODE_ORPHAN | classId
  const [section, setSection] = useState("");
  const [q, setQ] = useState("");
  const [onlyClass, setOnlyClass] = useState(false);

  const term = q.trim();
  const hasSearch = term.length >= 2;
  const isClassMode = !!mode && mode !== MODE_ALL && mode !== MODE_ORPHAN;
  const selectedClass = classes.find((c) => String(c._id) === mode);
  const sections = sectionNames(selectedClass);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((data) => {
          if (data?._id) setViewSchoolId(data._id);
        });
    }
  }, [isSuperAdmin]);

  // Classes for the chips (sorted by order)
  useEffect(() => {
    if (!effectiveSchoolId) return;
    fetch(`/api/classes?schoolId=${effectiveSchoolId}`)
      .then((r) => r.json())
      .then((d) =>
        setClasses(Array.isArray(d) ? [...d].sort((a, b) => (a.order || 0) - (b.order || 0)) : []),
      )
      .catch(() => {});
  }, [effectiveSchoolId]);

  // School info for the export header
  useEffect(() => {
    if (!effectiveSchoolId || schoolInfo) return;
    fetch(`/api/superadmin/schools?id=${effectiveSchoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchoolInfo(d))
      .catch(() => {});
  }, [effectiveSchoolId, schoolInfo]);

  const fetchParents = async () => {
    // Nothing chosen and nothing typed → empty page
    if (!effectiveSchoolId || (!mode && !hasSearch)) {
      setParents([]);
      return;
    }
    const params = new URLSearchParams({ schoolId: String(effectiveSchoolId) });
    if (hasSearch) params.set("q", term); // search works inside the chosen chip too
    if (mode === MODE_ORPHAN) params.set("orphan", "1");
    else if (isClassMode) {
      params.set("classId", mode);
      if (section) params.set("section", section);
    } // MODE_ALL → whole school

    setFetchLoading(true);
    try {
      const res = await fetch(`/api/parents?${params.toString()}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // API's own message (e.g. permission) — same text as the Access Denied modal
        notify.error(data?.message || data?.error || "Could not load parents list");
        setParents([]);
        return;
      }

      setParents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch parents:", error);
      notify.error("Could not load parents list");
      setParents([]);
    } finally {
      setFetchLoading(false);
    }
  };

  // Load when a filter changes (typing waits 400 ms)
  useEffect(() => {
    const t = setTimeout(fetchParents, q ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSchoolId, mode, section, q]);

  // Chip click: choose, or click again to clear
  const pickMode = (v: string) => {
    setMode((prev) => (prev === v ? "" : v));
    setSection("");
    setOnlyClass(false);
  };

  // Export header: what is shown
  const filterLabel = [
    mode === MODE_ALL
      ? "All school"
      : mode === MODE_ORPHAN
        ? "Orphan parents (no children)"
        : selectedClass
          ? `${selectedClass.name} (${section || "All sections"})`
          : "",
    hasSearch ? `Search: ${term}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const exportHeader: ExportHeader = {
    school: {
      name: schoolInfo?.name,
      address: schoolInfo?.address,
      logo: schoolInfo?.logo,
    },
    info: [
      { label: "Parents of", value: filterLabel },
      { label: "Total", value: parents.length },
    ],
  };

  const openDeleteDialog = (original: any) => {
    setParentToDelete({ id: original._id, name: original.fullName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!parentToDelete) return;

    try {
      const res = await fetch(`/api/parents`, {
        method: "DELETE",
        body: JSON.stringify({
          id: parentToDelete.id,
          schoolId: effectiveSchoolId,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        notify.error(
          data?.message || data?.error || "Could not delete parent. Please try again.",
        );
        return;
      }

      notify.success("Parent deleted successfully");
      fetchParents();
    } catch (error) {
      notify.error("Could not delete parent. Please try again.");
    } finally {
      setDeleteDialogOpen(false);
      setParentToDelete(null);
    }
  };

  const {
    isFormOpen,
    setIsFormOpen,
    isLoading,
    handleSubmit,
    openEditParent,
    selectedParent,
  } = useParentModal(parents, setParents, effectiveSchoolId);

  // Children to show: all, or only the chosen class (+ section) when ticked
  const childrenOf = (row: any): any[] => {
    const list: any[] = row?.students || [];
    if (!onlyClass || !isClassMode) return list;
    return list.filter(
      (s) => String(s.classId?._id || s.classId) === mode && (!section || s.section === section),
    );
  };

    const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        size: 45,
        enableResizing: false,
        enableSorting: false,
        enableColumnFilter: false,
        enableColumnDragging: false,
        enableColumnOrdering: false,
        Cell: ({ row }) => (
          <span className="text-muted-foreground font-mono dark:text-slate-300">
            {row.index + 1}
          </span>
        ),
      },
      {
        id: "parent_info",
        header: "Parent Details",
        accessorFn: (row) => `${row.fullName} (${row.p_id})`,
        meta: {
          exportHeaders: ["P-ID", "Parent Name"],
          getExportValue: (row) => [row.p_id || "---", row.fullName || "---"],
        },
        size: 170,
        Cell: ({ row }) => (
          <div className="flex items-start gap-1.5 whitespace-normal break-words leading-snug">
            <span className="font-mono text-slate-500 dark:text-slate-200 shrink-0">
              ({row.original.p_id})
            </span>
            <span className="text-foreground">{row.original.fullName}</span>
          </div>
        ),
      },

      { accessorKey: "cnic", header: "CNIC", size: 120 },

      { accessorKey: "phone", header: "Phone", size: 100 },

      {
        accessorKey: "address",
        header: "Address",
        size: 180,
        Cell: ({ row }) => (
          <div className="capitalize whitespace-normal break-words leading-snug">
            {row.original.address || "---"}
          </div>
        ),
      },
      { accessorKey: "gender", header: "Gender", size: 100 },
      { accessorKey: "occupation", header: "Occupation", size: 100 },
      {
        id: "siblings",
        header: "Registered Children",
        size: 250,
        accessorFn: (row) =>
          childrenOf(row)
            .map((s: any) => `${s.fullName} (${s.grNumber}) ${s.classId?.name || "N/A"} - ${s.section || ""}`)
            .join("\n") || "No students",
        Cell: ({ row }) => {
          const kids = childrenOf(row.original);
          return (
            <div className="flex flex-col gap-1">
              {kids.length > 0 ? (
                kids.map((child: any) => (
                  <div
                    key={child._id}
                    className="w-fit max-w-full text-[11px] px-1 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded text-foreground leading-tight flex flex-wrap items-center gap-1.5"
                  >
                    <span className="text-slate-700 dark:text-slate-200">{child.fullName}</span>
                    <span className="text-sky-700 dark:text-sky-400">({child.grNumber})</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-100 dark:border-amber-900/30">
                      {child.classId?.name || "N/A"} - {child.section || ""}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground text-[10px] italic px-2">No students</span>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlyClass, mode, section],
  );

  const table = useMaterialReactTable({
    columns,
    data: parents,
    // First load: skeleton rows. Later loads: old rows stay + thin bar (no empty flash)
    state: {
      isLoading: fetchLoading && parents.length === 0,
      showProgressBars: fetchLoading && parents.length > 0,
    },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    muiPaginationProps: {
      rowsPerPageOptions: [
        { label: "25", value: 25 },
        { label: "50", value: 50 },
        { label: "75", value: 75 },
        { label: "100", value: 100 },
        { label: "All", value: 100000 },
      ],
    },
    enableDensityToggle: false, // Density toggle disable
    enableColumnActions: false, // 3 dots menu disable
    initialState: {
      density: "compact",
      pagination: { pageSize: 25, pageIndex: 0 },
      columnVisibility: { address: true, gender: false, occupation: false },
    },
    enableKeyboardShortcuts: false,
    enableRowActions: canEdit || canDelete,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 80, header: "Actions" },
    },
    // Export Buttons
    renderTopToolbarCustomActions: ({ table }) => (
      <ExportButtons
        table={table}
        module="parents"
        title="Parents List Report"
        header={exportHeader}
      />
    ),

    renderRowActions: ({ row }) => {
      // A parent with children can't be deleted (their students would lose the parent)
      const hasKids = (row.original.students?.length || 0) > 0;
      return (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditParent(row.original)}
              className="h-8 w-8 cursor-pointer hover:bg-accent"
            >
              <Pencil className="h-4 w-4 text-sky-500" />
            </Button>
          )}

          {canDelete && !hasKids && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(row.original)}
              className="h-8 w-8 cursor-pointer hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      );
    },
     muiTableProps: { sx: { tableLayout: "fixed" } },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: 0,
        border: "none",
        backgroundColor: "transparent",
        padding: "0px 10px",
      },
    },

    muiTableHeadCellProps: {
      sx: { fontWeight: "700", fontSize: "12px", padding: "12px 8px" },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "12px",
        whiteSpace: "pre-line",
        verticalAlign: "center",
        padding: "5px",
      },
    },
  });

  return (
    <div className="space-y-2">
      <PageHeader
        title="Parent Information"
        buttonLabel={canCreate ? "Add Parent" : undefined}
        onButtonClick={canCreate ? () => openEditParent(null) : undefined}
      />

      {/* ── Filters: search + class chips + section chips ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Search + Orphan */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                isClassMode
                  ? `Search in ${selectedClass?.name}: name, CNIC, phone or P-ID…`
                  : "Search name, CNIC, phone or P-ID…"
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-900 dark:focus:ring-sky-500/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => pickMode(MODE_ORPHAN)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer ${
              mode === MODE_ORPHAN
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            }`}
          >
            <UserX className="h-4 w-4" /> Orphan parents
          </button>
        </div>

        {/* Class chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => pickMode(MODE_ALL)}
            className={`${CHIP} ${mode === MODE_ALL ? CHIP_ON : CHIP_OFF}`}
          >
            All school
          </button>
          {classes.map((c) => {
            const id = String(c._id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickMode(id)}
                className={`${CHIP} ${mode === id ? CHIP_ON : CHIP_OFF}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Section chips + "only this class" (after a class is chosen) */}
        {isClassMode && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
            <span className="mr-1 text-[11px] text-slate-400 dark:text-slate-500">Section:</span>
            <button type="button" onClick={() => setSection("")} className={`${SEC} ${!section ? SEC_ON : SEC_OFF}`}>
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
            <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlyClass}
                onChange={(e) => setOnlyClass(e.target.checked)}
                className="h-4 w-4 accent-sky-600 cursor-pointer"
              />
              Only {selectedClass?.name}
              {section ? ` (${section})` : ""} children
            </label>
          </div>
        )}
      </div>

      {/* ── Table / empty state ── */}
      {!mode && !hasSearch ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Filter className="h-8 w-8" />
          Pick a class or type at least 2 letters to search
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <MaterialReactTable table={table} />
        </div>
      )}

      <ParentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        parent={selectedParent}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        schoolId={effectiveSchoolId}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={parentToDelete?.name || "this parent"}
      />
    </div>
  );
}

// Guard: page opens only with "Parents → View"
export default function Page() {
  return (
    <PageGuard module="parents">
      <ParentsPage />
    </PageGuard>
  );
}