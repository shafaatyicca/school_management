"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ParentFormModal from "@/components/ParentFormModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Modals States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  // Student Modal states
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    setFetchLoading(true);

    try {
      const res = await fetch("/api/parents");
      const data = await res.json();
      setParents(data);
    } catch (error) {
      console.error("Failed to fetch parents:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this parent? This may affect linked students.",
      )
    ) {
      try {
        await fetch("/api/parents", {
          method: "DELETE",
          body: JSON.stringify({ id }),
          headers: { "Content-Type": "application/json" },
        });

        fetchParents();
      } catch (error) {
        console.error("Delete failed");
      }
    }
  };

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
          exportHeaders: ["P-ID", "Full Name"],
          getExportValue: (row: any) => [
            row.p_id || "---",
            row.fullName || "---",
          ],
        },
        size: 180,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => {
              setSelectedParent(row.original);
              setIsViewOpen(true);
            }}
          >
            <span className="font-mono text-slate-500 dark:text-slate-200 group-hover:underline">
              ({row.original.p_id})
            </span>
            <span className="text-sky-600 dark:text-sky-400 group-hover:underline transition-all">
              {row.original.fullName}
            </span>
          </div>
        ),
      },

      { accessorKey: "cnic", header: "CNIC", size: 130 },

      { accessorKey: "phone", header: "Phone", size: 120 },

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
      { accessorKey: "gender", header: "Gender", size: 100 },
      { accessorKey: "occupation", header: "Occupation", size: 120 },
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
      columnVisibility: { address: true, gender: true },
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
          onClick={() => {
            setSelectedParent(row.original);

            setIsFormOpen(true);
          }}
          className="h-8 w-8 cursor-pointer hover:bg-accent"
        >
          <Pencil className="h-4 w-4 text-sky-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(row.original._id)}
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
      },
    },
  });

  return (
    <div className="space-y-2">
      <PageHeader
        title="Parents Management"
        buttonLabel="Add Parent"
        onButtonClick={() => {
          setSelectedParent(null);

          setIsFormOpen(true);
        }}
      />

      <div className="border border-border rounded-xl shadow-sm bg-background overflow-hidden">
        <MaterialReactTable table={table} />
      </div>

      <ParentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        parent={selectedParent}
        isLoading={isLoading}
        onSubmit={async (data: any) => {
          setIsLoading(true);

          const method = selectedParent ? "PUT" : "POST";
          const res = await fetch("/api/parents", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              selectedParent ? { id: selectedParent._id, ...data } : data,
            ),
          });

          if (res.ok) {
            await fetchParents();
            setIsFormOpen(false);
          } else {
            const err = await res.json();
            alert("Error: " + err.message);
          }

          setIsLoading(false);
        }}
      />

      <ParentProfileModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        parent={selectedParent}
        onStudentClick={(student) => {
          setSelectedStudent(student);

          setIsStudentViewOpen(true);
        }}
      />

      <StudentProfileModal
        isOpen={isStudentViewOpen}
        onClose={() => setIsStudentViewOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}
