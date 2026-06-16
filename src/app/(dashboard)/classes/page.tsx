"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowDown10, Save, X, BookOpen, Pencil, Trash2 } from "lucide-react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
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

export default function ClassPage() {
  const { data: session, status } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  const [classes, setClasses] = useState<any[]>([]);
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderMap, setOrderMap] = useState<{ [key: string]: number }>({});
  const [feeMap, setFeeMap] = useState<{ [key: string]: number }>({});
  const [isFeeMode, setIsFeeMode] = useState(false);
  const [modal, setModal] = useState({ open: false, data: null });
  const [loading, setLoading] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchClasses = async () => {
    if (!effectiveSchoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?schoolId=${effectiveSchoolId}`);
      const data = await res.json();
      setClasses(
        data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      );
      const oMap: any = {};
      const fMap: any = {};
      data.forEach((c: any) => {
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
    const hostname = window.location.hostname;
    const isSubdomain =
      hostname.includes(".lvh.me") || hostname.includes(".localhost");
    if (isSubdomain) {
      const slug = hostname.split(".")[0];
      fetch(`/api/superadmin/schools?slug=${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?._id) setViewSchoolId(data._id);
        });
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (effectiveSchoolId) fetchClasses();
  }, [effectiveSchoolId]);

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
      if (res.ok) {
        fetchClasses();
        setDeleteDialog({ open: false, id: null });
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleBulkSave = async (mode: "order" | "fee") => {
    setLoading(true);

    // Sirf wahi data payload mein bhejein jiski zaroorat hai
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
      await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, schoolId: effectiveSchoolId, mode }), // mode ko sath bheja
      });

      if (mode === "order") setIsOrderMode(false);
      if (mode === "fee") setIsFeeMode(false);

      fetchClasses();
    } catch (error) {
      console.error(`Bulk update failed for ${mode}:`, error);
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
            {cell.getValue<string[]>().map((s, i) => (
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
          <div className="flex items-center justify-center w-full">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-600 dark:text-slate-400 text-[11px]">
              {row.original.order || 0}
            </span>
          </div>
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
    // enableRowActions: !isOrderMode,
    enableRowActions: isSuperAdmin,
    positionActionsColumn: "last",
    initialState: {
      density: "compact",
      pagination: { pageSize: 15, pageIndex: 0 },
    },
    renderRowActions: ({ row }) =>
      isSuperAdmin ? (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setModal({ open: true, data: row.original })}
          >
            <Pencil className="w-4 h-4 text-sky-500" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() =>
              setDeleteDialog({ open: true, id: row.original._id })
            }
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ) : null,

    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2">
        {/* 1. Set Orders Button - Ab click hote hi Popup open karega */}
        <Button
          onClick={() => setIsOrderModalOpen(true)}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer h-8"
        >
          <ArrowDown10 className="h-4 w-4 mr-1" /> Set Orders
        </Button>

        {/* 2. Set Class Fee Button - Only Super Admin aur click par Popup open hoga */}
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

        {/* Divider Line */}
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Export Buttons */}
        <Button
          onClick={() =>
            handleExportRows(table, "excel", "Classes List Report")
          }
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer h-8"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button
          onClick={() => handleExportRows(table, "pdf", "Classes List Report")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer h-8"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button
          onClick={() => handlePrintTable(table, "Classes List Report")}
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer h-8 dark:text-slate-300"
        >
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
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
      />{" "}
    </div>
  );
}
