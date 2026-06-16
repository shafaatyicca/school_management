"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, CreditCard, Trash2, Pencil, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  studentId: string;
  schoolId: string;
  onPayClick: (invoice: any) => void;
  onDetailClick: (invoice: any) => void;
}

export default function StudentInvoiceTable({ studentId, schoolId, onPayClick, onDetailClick  }: Props) {
  const [invoices,     setInvoices]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; title?: string }>({
    open: false, id: null,
  });

  const fetchInvoices = () => {
    if (!studentId) return;
    setLoading(true);
    fetch(`/api/Fee_Management/invoices?studentId=${studentId}&schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => notify.error("Failed to load invoices"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [studentId]);

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const res = await fetch("/api/Fee_Management/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      if (res.ok) {
        notify.success("Invoice deleted!");
        setDeleteDialog({ open: false, id: null });
        fetchInvoices();
      } else {
        notify.error("Failed to delete");
      }
    } catch {
      notify.error("Something went wrong");
    }
  };

  const statusBadge = (status: string) => {
    const map: any = {
      paid:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
      partial: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      pending: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${map[status] || map.pending}`}>
        {status}
      </span>
    );
  };
  // Totals calculate karo
const totals = useMemo(() => ({
  baseFee:         invoices.reduce((sum, inv) => sum + (inv.baseFee || 0), 0),
  discount:        invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0),
  netPayable:      invoices.reduce((sum, inv) => sum + (inv.netPayable || 0), 0),
  paidAmount:      invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
  remainingAmount: invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0),
}), [invoices]);
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        size: 40,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        size: 50,
        Cell: ({ cell }) => (
          <span className="text-foreground text-xs">
            {new Date(cell.getValue<string>()).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        size: 160,
        Footer: () => <span className="font-bold text-xs" style={{ color: "var(--muted-foreground)" }}>GRAND TOTAL</span>,
        Cell: ({ cell, row }) => (
        <span
          className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer text-xs"
          onClick={() => onDetailClick(row.original)}
        >
          {cell.getValue<string>()}
        </span>
      ),
      },
      {
        id: "month_year",
        header: "Month",
        size: 100,
        accessorFn: (row) => `${MONTHS[row.month]} ${row.year}`,
        Cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {MONTHS[row.original.month]} {row.original.year}
          </span>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        size: 110,
        Cell: ({ cell }) => (
          <span className="text-foreground text-xs">{cell.getValue<string>() || "N/A"}</span>
        ),
      },
      {
        accessorKey: "baseFee",
        header: "Amount",
        size: 50,
        Footer: () => <span className="text-blue-600 font-bold text-xs">{totals.baseFee.toLocaleString()}</span>,
        Cell: ({ cell }) => (
          <span className="text-blue-600 font-medium text-xs">
            {cell.getValue<number>()?.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "discount",
        header: "Discount",
        size: 50,
        Footer: () => <span className="text-pink-500 font-bold text-xs">{totals.discount.toLocaleString()}</span>,
        Cell: ({ cell }) => (
          <span className="text-pink-500 font-medium text-xs">
            {cell.getValue<number>() > 0
              ? cell.getValue<number>()?.toLocaleString()
              : "0"}
          </span>
        ),
      },
      {
        accessorKey: "netPayable",
        header: "Payable",
        size: 50,
        Footer: () => <span className="text-foreground font-bold text-xs">{totals.netPayable.toLocaleString()}</span>,
        Cell: ({ cell }) => (
          <span className="text-foreground font-bold text-xs">
            {cell.getValue<number>()?.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "paidAmount",
        header: "Paid",
        size: 50,
        Footer: () => <span className="text-green-600 font-bold text-xs">{totals.paidAmount.toLocaleString()}</span>,
        Cell: ({ cell }) => (
          <span className="text-green-600 font-bold text-xs">
            {cell.getValue<number>()?.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "remainingAmount",
        header: "Dues",
        size: 50,
        Footer: () => <span className="text-red-500 font-bold text-xs">{totals.remainingAmount.toLocaleString()}</span>,
        Cell: ({ cell }) => (
          <span className="text-red-500 font-bold text-xs">
            {cell.getValue<number>()?.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 80,
        Cell: ({ cell }) => statusBadge(cell.getValue<string>()),
      },
    ],
    [totals, onDetailClick ],
  );

  const table = useMaterialReactTable({
    columns,
    data: invoices,
    state: { showProgressBars: loading },
    enableDensityToggle: false,
    enablePagination: false,
    enableColumnActions: false,
    enableRowActions: true,
    enableBottomToolbar: false,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 90, header: "Actions" },
    },
    initialState: {
      density: "compact",
      pagination: { pageSize: 10, pageIndex: 0 },
    },
   renderRowActions: ({ row }) => {
  const isPaid = row.original.status === "paid";
  const isPartial = row.original.status === "partial";

  return (
    <div className="flex items-center gap-1">
      {isPaid ? (
        <button
          onClick={() => onDetailClick(row.original)}
          className="text-xs text-blue-500 hover:text-blue-700 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
        >
          Recent Payment
        </button>
      ) : (
        <>
          <Button size="icon" variant="ghost" title="Take Payment" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-sky-500/10 cursor-pointer" onClick={() => onPayClick(row.original)}>
            <CreditCard className="w-4 h-4" />
          </Button>
          
          <Button size="icon" variant="ghost" title="Edit Invoice" className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" onClick={() => {/* Apka Edit logic */}}>
            <Pencil className="w-4 h-4" />
          </Button>

          {!isPartial && (
            <Button size="icon" variant="ghost" title="Delete Invoice" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => setDeleteDialog({ open: true, id: row.original._id, title: row.original.title })}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
},
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleExportRows(table, "excel", "Invoice Report")}
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer h-7 text-[11px]"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
        </Button>
        <Button
          onClick={() => handleExportRows(table, "pdf", "Invoice Report")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer h-7 text-[11px]"
        >
          <FileText className="h-3.5 w-3.5 mr-1" /> PDF
        </Button>
        <Button
          onClick={() => handlePrintTable(table, "Invoice Report")}
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer h-7 text-[11px] dark:text-slate-300"
        >
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
        <Button
          onClick={fetchInvoices}
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer h-7 text-[11px] dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "0px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        padding: "0px 6px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: "700",
        fontSize: "11px",
        padding: "8px 6px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "11px",
        padding: "4px 6px",
        color: "var(--foreground)",
      },
    },
    muiTableFooterCellProps: {
  sx: {
    fontSize: "11px",
    padding: "4px 6px",
    fontWeight: "700",
    backgroundColor: "var(--muted)",
    borderTop: "1px solid var(--border)",
  },
},
  });

  return (
    <>
      <div className="rounded-md border bg-background shadow-sm overflow-hidden mt-2">
        <MaterialReactTable table={table} />
      </div>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName={deleteDialog.title || "this invoice"}
      />
    </>
  );
}