"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowDown10, Save, BookOpen, Pencil, Trash2 } from "lucide-react";
import { type ExportHeader } from "@/lib/exportUtils";
import ExportButtons from "@/components/ExportButtons";
import { usePermissions } from "@/components/PermissionsProvider";
import PageGuard from "@/components/PageGuard";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import ClassFormModal from "@/components/ClassFormModal";
import PageHeader from "@/components/PageHeader";
import SetFeeModal from "@/components/SetClassFeeModal";
import SetOrderModal from "@/components/SetClassOrderModal";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useSession } from "next-auth/react";
import { getSubdomain } from "@/lib/host";


function ClassPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  // Permissions
  const { can } = usePermissions();
  const canSetOrders = can("classes", "edit"); // Set Orders
  const canExport = can("classes", "export"); // divider next to export buttons
  // Add / Edit / Delete / Set Class Fee stay Super Admin only (by design)

  const [classes, setClasses] = useState<any[]>([]);
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderMap, setOrderMap] = useState<{ [key: string]: number }>({});
  const [feeMap, setFeeMap] = useState<{ [key: string]: number }>({});
  const [isFeeMode, setIsFeeMode] = useState(false);
  const [modal, setModal] = useState({ open: false, data: null });
  const [loading, setLoading] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  const fetchClasses = async () => {
    if (!effectiveSchoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?schoolId=${effectiveSchoolId}`);
      const data = await res.json().catch(() => null);
      // API error (e.g. no permission) → empty list instead of a crash
      const list = Array.isArray(data) ? data : [];
      setClasses(
        [...list].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      );
      const oMap: any = {};
      const fMap: any = {};
      list.forEach((c: any) => {
        oMap[c._id] = c.order || 0;
        fMap[c._id] = c.classFee || 0;
      });
      setOrderMap(oMap);
      setFeeMap(fMap);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (effectiveSchoolId) fetchClasses();
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId) return;
    fetch(`/api/superadmin/schools?id=${effectiveSchoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchoolInfo(d))
      .catch(() => {});
  }, [effectiveSchoolId]);

  // Export header: school only (no student info on this page)
  const exportHeader: ExportHeader = {
    school: {
      name: schoolInfo?.name,
      address: schoolInfo?.address,
      logo: schoolInfo?.logo,
    },
  };

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const res = await fetch(
        `/api/classes?id=${deleteDialog.id}&schoolId=${effectiveSchoolId}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json().catch(() => null);
      if (res.ok) {
        notify.success("Class deleted");
        fetchClasses();
      } else {
        notify.error(data?.message || data?.error || "Failed to delete class");
      }
    } catch (error) {
      console.error("Delete failed", error);
      notify.error("Something went wrong");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleBulkSave = async (mode: "order" | "fee") => {
    setLoading(true);

    // Send only the data that is needed
    const items = classes.map((cls) => {
      if (mode === "order") {
        return {
          id: cls._id,
          order: orderMap[cls._id] ?? 0,
        };
      } else {
        return {
          id: cls._id,
          classFee: feeMap[cls._id] ?? 0,
        };
      }
    });

    try {
      const res = await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, schoolId: effectiveSchoolId, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        notify.error(
          data?.message || data?.error ||
            (mode === "order" ? "Failed to save order" : "Failed to save class fee"),
        );
        return;
      }

      if (mode === "order") setIsOrderMode(false);
      if (mode === "fee") setIsFeeMode(false);

      fetchClasses();
    } catch (error) {
      console.error(`Bulk update failed for ${mode}:`, error);
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        size: 50,
        Cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "name",
        header: "Class Name",
        size: 150,
        Cell: ({ cell }) => (
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "sections",
        header: "Sections",
        size: 200,
        Cell: ({ cell }) => (
          <div className="flex gap-1 flex-wrap">
            {(cell.getValue<string[]>() || []).map((s, i) => (
              <span
                key={i}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800"
              >
                {s}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "classFee",
        header: "Class Fee",
        size: 140,
        Cell: ({ row }) => (
          <div className="flex items-center justify-start w-full pl-1">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {row.original.classFee
                ? row.original.classFee.toLocaleString()
                : "0"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "order",
        header: "Sort Order",
        size: 90,
        Cell: ({ row }) => (
          <div className="flex items-center justify-start w-full pl-1">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-600 dark:text-slate-400 text-[11px]">
              {row.original.order || 0}
            </span>
          </div>
        ),
      },
      {
        // "Used" = has students (active or inactive), "Empty" = none
        id: "status",
        header: "Status",
        size: 90,
        accessorFn: (row) => ((row.studentCount || 0) > 0 ? "Used" : "Empty"),
        Cell: ({ row }) =>
          (row.original.studentCount || 0) > 0 ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              Used
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Empty
            </span>
          ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: classes,
    state: { showProgressBars: loading },
    enableDensityToggle: false,
    enableColumnActions: false,
    enableRowActions: isSuperAdmin, // Edit / Delete: Super Admin only
    enableKeyboardShortcuts: false,
    positionActionsColumn: "last",
    initialState: {
      density: "compact",
      pagination: { pageSize: 15, pageIndex: 0 },
    },
    renderRowActions: ({ row }) => {
      if (!isSuperAdmin) return null;
      const used = (row.original.studentCount || 0) > 0;
      return (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setModal({ open: true, data: row.original })}
          >
            <Pencil className="w-4 h-4 text-sky-500" />
          </Button>
          {/* A used class can't be deleted (span keeps the tooltip on a disabled button) */}
          <span title={used ? "This class has students" : "Delete class"}>
            <Button
              size="icon"
              variant="ghost"
              disabled={used}
              className="h-8 w-8 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setDeleteDialog({ open: true, id: row.original._id })}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </span>
        </div>
      );
    },

    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2">
        {/* 1. Set Orders → "Classes → Edit" */}
        {canSetOrders && (
          <Button
            onClick={() => setIsOrderModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer h-8"
          >
            <ArrowDown10 className="h-4 w-4 mr-1" /> Set Orders
          </Button>
        )}

        {/* 2. Set Class Fee → Super Admin only */}
        {isSuperAdmin && (
          <Button
            onClick={() => setIsFeeModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer h-8"
          >
            <Save className="h-4 w-4 mr-1" /> Set Class Fee
          </Button>
        )}

        {/* Divider Line (only when there is something on both sides) */}
        {canExport && (canSetOrders || isSuperAdmin) && (
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
        )}

        {/* Export Buttons → "Classes → Export / Print" */}
        <ExportButtons
          table={table}
          module="classes"
          title="Classes List Report"
          header={exportHeader}
        />
      </div>
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "16px",
        border: "1px solid var(--border)",
        padding: "0px 10px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: "700",
        fontSize: "13px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
        fontWeight: "500",
        color: "var(--foreground)",
      },
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Class Manager"
        buttonLabel={isSuperAdmin ? "Add Class" : undefined}
        onButtonClick={
          isSuperAdmin ? () => setModal({ open: true, data: null }) : undefined
        }
        icon={<BookOpen className="w-4 h-4" />}
      />
      <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
        <MaterialReactTable table={table} />
      </div>
      <ClassFormModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        editClass={modal.data}
        onSuccess={fetchClasses}
        schoolId={effectiveSchoolId}
      />
      <SetFeeModal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        classes={classes}
        feeMap={feeMap}
        setFeeMap={setFeeMap}
        onSave={async () => {
          await handleBulkSave("fee");
          setIsFeeModalOpen(false);
        }}
        loading={loading}
      />
      <SetOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        classes={classes}
        orderMap={orderMap}
        setOrderMap={setOrderMap}
        onSave={async () => {
          await handleBulkSave("order");
          setIsOrderModalOpen(false);
        }}
        loading={loading}
      />
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName="Class"
      />
    </div>
  );
}

// Guard: page opens only with "Classes → View"
export default function Page() {
  return (
    <PageGuard module="classes">
      <ClassPage />
    </PageGuard>
  );
}