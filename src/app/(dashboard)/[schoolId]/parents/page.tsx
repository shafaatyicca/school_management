"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Pencil,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useParentModal } from "@/hooks/useParentModal";
import ParentFormModal from "@/components/ParentFormModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";

export default function ParentsPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  const [parents, setParents] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchParents();
  }, [schoolId]);

  const fetchParents = async () => {
    // 1. Pehle loader start karein
    setFetchLoading(true);

    try {
      // 2. SchoolId check karein
      if (!schoolId) {
        console.error("School ID missing from URL");
        setFetchLoading(false);
        return;
      }

      const res = await fetch(`/api/parents?schoolId=${schoolId}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Server error");
      }

      const data = await res.json();
      setParents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch parents:", error);
      notify.error("Could not load parents list");
      setParents([]);
    } finally {
      setFetchLoading(false);
    }
  };
  const openDeleteDialog = (original: any) => {
    setParentToDelete({ id: original._id, name: original.fullName });
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!parentToDelete) return;

    try {
      const res = await fetch(`/api/parents?schoolId=${schoolId}`, {
        method: "DELETE",
        body: JSON.stringify({ id: parentToDelete.id }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to delete");

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
  } = useParentModal(parents, setParents, schoolId);

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        size: 30,
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
        size: 120,
        Cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {/* onClick aur cursor-pointer remove kar diya gaya hai */}
            <span className="font-mono text-slate-500 dark:text-slate-200">
              ({row.original.p_id})
            </span>
            <span className="text-foreground">{row.original.fullName}</span>
          </div>
        ),
      },

      { accessorKey: "cnic", header: "CNIC", size: 100 },

      { accessorKey: "phone", header: "Phone", size: 100 },

      {
        accessorKey: "address",
        header: "Address",
        size: 200,
        Cell: ({ row }) => (
          <div
            className="capitalize truncate max-w-[180px] print:whitespace-normal print:max-w-none"
            title={row.original.address}
          >
            {row.original.address || "---"}
          </div>
        ),
      },
      { accessorKey: "gender", header: "Gender", size: 80 },
      { accessorKey: "occupation", header: "Occupation", size: 80 },
      {
        id: "siblings",
        header: "Registered Children",
        size: 180,
        accessorFn: (row) =>
          row.students
            ?.map(
              (s: any) =>
                `GR-${s.grNumber} ${s.fullName} (${s.classId?.name || "N/A"} - ${s.section || ""})`,
            )
            .join("\n") || "No students",
        Cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.students && row.original.students.length > 0 ? (
              row.original.students.map((child: any) => (
                <div
                  key={child._id}
                  className="w-fit text-[11px] px-1 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded text-foreground leading-tight flex items-center gap-1.5"
                >
                  <span className=" text-sky-700 dark:text-sky-400">
                    GR-{child.grNumber}
                  </span>
                  <span className=" text-slate-700 dark:text-slate-200">
                    {child.fullName}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-100 dark:border-amber-900/30 ">
                    {child.classId?.name || "N/A"} - {child.section || ""}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground text-[10px] italic px-2">
                No students
              </span>
            )}
          </div>
        ),
      },
    ],

    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: parents,
    state: { showProgressBars: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableDensityToggle: false, // Density toggle disable
    enableColumnActions: false, // 3 dots menu disable
    initialState: {
      density: "compact",
      columnVisibility: { address: true, gender: false, occupation: false },
    },

    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 80, header: "Actions" },
    },
    // Export Buttons
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2">
        {/* Excel Button */}
        <Button
          onClick={() =>
            handleExportRows(table, "excel", "Parents List Report")
          }
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer h-8"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>

        {/* PDF Button */}
        <Button
          onClick={() => handleExportRows(table, "pdf", "Parents List Report")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer h-8"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>

        {/* Print Button */}
        <Button
          onClick={() => handlePrintTable(table, "Parents List Report")}
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer h-8 dark:text-slate-300"
        >
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>
    ),

    renderRowActions: ({ row }) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEditParent(row.original)}
          className="h-8 w-8 cursor-pointer hover:bg-accent"
        >
          <Pencil className="h-4 w-4 text-sky-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => openDeleteDialog(row.original)}
          className="h-8 w-8 cursor-pointer hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),

    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "16px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--background)",
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
        title="Parents Management"
        buttonLabel="Add Parent"
        onButtonClick={() => openEditParent(null)}
      />

      <div className="border border-border rounded-xl shadow-sm bg-background overflow-hidden">
        <MaterialReactTable table={table} />
      </div>
      <ParentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        parent={selectedParent}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        schoolId={schoolId}
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
