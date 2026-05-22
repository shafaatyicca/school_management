"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowDown10, Save, X, BookOpen, Pencil, Trash2 } from "lucide-react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import ClassFormModal from "@/components/ClassFormModal";
import PageHeader from "@/components/PageHeader";
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
  const [modal, setModal] = useState({ open: false, data: null });
  const [loading, setLoading] = useState(false);

  const fetchClasses = async () => {
    if (!effectiveSchoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classes?schoolId=${effectiveSchoolId}`);
      const data = await res.json();
      setClasses(
        data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      );
      const map: any = {};
      data.forEach((c: any) => (map[c._id] = c.order || 0));
      setOrderMap(map);
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

  const handleBulkSave = async () => {
    setLoading(true);
    const items = Object.entries(orderMap).map(([id, order]) => ({
      id,
      order,
    }));
    await fetch("/api/classes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, schoolId: effectiveSchoolId }),
    });
    setIsOrderMode(false);
    setLoading(false);
    fetchClasses();
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
          <span className=" text-slate-700 dark:text-slate-200">
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
        accessorKey: "order",
        header: "Sort Order",
        size: 80,
        Cell: ({ row }) =>
          isOrderMode ? (
            <input
              type="text"
              inputMode="numeric"
              className="w-10 h-8 rounded border border-slate-300 bg-white px-1 text-center font-bold text-sm text-slate-700 outline-none transition-all 
                 /* Dark Mode Styling */
                 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 
                 /* Dark Mode Focus */
                 dark:focus:border-blue-400 dark:focus:ring-blue-900/40 dark:focus:bg-slate-800"
              value={
                orderMap[row.original._id] === 0
                  ? ""
                  : orderMap[row.original._id]
              }
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setOrderMap({
                    ...orderMap,
                    [row.original._id]: val === "" ? 0 : parseInt(val),
                  });
                }
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const inputs = document.querySelectorAll<HTMLInputElement>(
                    "input[inputmode='numeric']",
                  );
                  const index = Array.from(inputs).indexOf(e.currentTarget);
                  const next = inputs[index + 1];
                  if (next) {
                    next.focus();
                    next.select();
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center w-full">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                {row.original.order || 0}
              </span>
            </div>
          ),
      },
    ],
    [isOrderMode, orderMap],
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
        {!isOrderMode ? (
          <>
            <Button
              onClick={() => setIsOrderMode(true)}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer h-8"
            >
              <ArrowDown10 className="h-4 w-4 mr-1" /> Set Orders
            </Button>

            {/* Divider Line */}
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Excel Button */}
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

            {/* PDF Button */}
            <Button
              onClick={() =>
                handleExportRows(table, "pdf", "Classes List Report")
              }
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer h-8"
            >
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>

            {/* Print Button */}
            <Button
              onClick={() => handlePrintTable(table, "Classes List Report")}
              variant="outline"
              size="sm"
              className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer h-8 dark:text-slate-300"
            >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleBulkSave}
              size="sm"
              className="bg-green-600 hover:bg-green-700 cursor-pointer h-8 text-white font-bold"
            >
              <Save className="h-4 w-4 mr-1" /> Save Order
            </Button>
            <Button
              onClick={() => setIsOrderMode(false)}
              size="sm"
              variant="ghost"
              className="cursor-pointer hover:bg-red-50 text-red-600 border border-red-100 h-8"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        )}
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
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName="Class"
      />{" "}
    </div>
  );
}
