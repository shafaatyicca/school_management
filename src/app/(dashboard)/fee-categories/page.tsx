"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Pencil,
  Trash2,
  CalendarCheck,
  GraduationCap,
} from "lucide-react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Zoom,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useSession } from "next-auth/react";
import { notify } from "@/lib/notify";

type FeeSource = "fixed" | "class_fee";

type CategoryFormValues = {
  name: string;
  isMonthly: boolean;
  maxBaseFee: number;
  feeSource: FeeSource;
};

export default function FeeCategoryPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // States for Single Add/Edit Modal
  const [formModal, setFormModal] = useState<{
    open: boolean;
    data: any | null;
  }>({
    open: false,
    data: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

  // Kya is school mein pehle se koi class fee category hai? (modal mein checkbox disable karne ke liye)
  const existingClassFeeCategoryId = useMemo(
    () => categories.find((c) => c.feeSource === "class_fee")?._id || null,
    [categories],
  );

  // Fetch Data
  const fetchCategories = async () => {
    if (!effectiveSchoolId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/Fee_Management/fee-categories?schoolId=${effectiveSchoolId}`,
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Resolve Subdomain for Super Admin
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
    if (effectiveSchoolId) fetchCategories();
  }, [effectiveSchoolId]);

  // Handle Save (POST / PUT)
  const handleSaveCategory = async (values: CategoryFormValues) => {
    if (!values.name.trim() || !effectiveSchoolId) return;

    setLoading(true);
    const isEditing = !!formModal.data;
    const url = "/api/Fee_Management/fee-categories";
    const method = isEditing ? "PUT" : "POST";

    const payload = isEditing
      ? {
          id: formModal.data._id,
          name: values.name,
          isMonthly: values.isMonthly,
          maxBaseFee: values.maxBaseFee,
          feeSource: values.feeSource,
          schoolId: effectiveSchoolId,
        }
      : {
          name: values.name,
          isMonthly: values.isMonthly,
          maxBaseFee: values.maxBaseFee,
          feeSource: values.feeSource,
          schoolId: effectiveSchoolId,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify.success(isEditing ? "Category updated" : "Category created");
        setFormModal({ open: false, data: null });
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        notify.error(err?.message || "Failed to save category");
      }
    } catch (error) {
      console.error("Save failed:", error);
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteDialog.id || !effectiveSchoolId) return;
    try {
      const res = await fetch(
        `/api/Fee_Management/fee-categories?id=${deleteDialog.id}&schoolId=${effectiveSchoolId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        fetchCategories();
        setDeleteDialog({ open: false, id: null });
      }
    } catch (error) {
      console.error("Delete failed", error);
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
        header: "Category Name",
        size: 150,
        Cell: ({ cell }) => (
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "isMonthly",
        header: "Billing Cycle",
        size: 150,
        Cell: ({ cell }) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              cell.getValue<boolean>()
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            }`}
          >
            {cell.getValue<boolean>() ? "Monthly Fee" : "One-Time / Occasional"}
          </span>
        ),
      },
      {
        accessorKey: "maxBaseFee",
        header: "Max Base Fee",
        size: 140,
        Cell: ({ row }) => (
          <div className="flex items-center justify-start w-full pl-1">
            {row.original.feeSource === "class_fee" ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                Dynamic
              </span>
            ) : (
              <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                {row.original.maxBaseFee
                  ? row.original.maxBaseFee.toLocaleString()
                  : "0"}
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
    data: categories,
    state: { showProgressBars: loading },
    enableDensityToggle: false,
    enableColumnActions: false,
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
            onClick={() => setFormModal({ open: true, data: row.original })}
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
        <Button
          onClick={() =>
            handleExportRows(table, "excel", "Fee Categories List")
          }
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer h-8"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button
          onClick={() => handleExportRows(table, "pdf", "Fee Categories List")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer h-8"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button
          onClick={() => handlePrintTable(table, "Fee Categories List")}
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
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Category Manager"
        buttonLabel={isSuperAdmin ? "Add Category" : undefined}
        onButtonClick={
          isSuperAdmin
            ? () => setFormModal({ open: true, data: null })
            : undefined
        }
        icon={<Layers className="w-4 h-4" />}
      />

      <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
        <MaterialReactTable table={table} />
      </div>

      {/* ================= ADD / EDIT MODAL ================= */}
      <CategoryFormModal
        open={formModal.open}
        data={formModal.data}
        loading={loading}
        existingClassFeeCategoryId={existingClassFeeCategoryId}
        onClose={() => setFormModal({ open: false, data: null })}
        onSave={handleSaveCategory}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName="Fee Category"
      />
    </div>
  );
}

/* ================= SEPARATE FORM MODAL (local state = no table re-render) ================= */
function CategoryFormModal({
  open,
  data,
  loading,
  existingClassFeeCategoryId,
  onClose,
  onSave,
}: {
  open: boolean;
  data: any | null;
  loading: boolean;
  existingClassFeeCategoryId: string | null;
  onClose: () => void;
  onSave: (values: CategoryFormValues) => void;
}) {
  const [name, setName] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [maxBaseFee, setMaxBaseFee] = useState<number | "">("");
  const [feeSource, setFeeSource] = useState<FeeSource>("fixed");

  const isClassFee = feeSource === "class_fee";

  // Agar school mein koi aur category pehle se class fee se linked hai to checkbox lock
  const classFeeLockedByOther =
    !!existingClassFeeCategoryId && existingClassFeeCategoryId !== data?._id;

  // Sync Form States when modal opens
  useEffect(() => {
    if (!open) return;
    if (data) {
      setName(data.name || "");
      setIsMonthly(data.isMonthly || false);
      setMaxBaseFee(data.maxBaseFee || "");
      setFeeSource(data.feeSource === "class_fee" ? "class_fee" : "fixed");
    } else {
      setName("");
      setIsMonthly(false);
      setMaxBaseFee("");
      setFeeSource("fixed");
    }
  }, [data, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      isMonthly: isClassFee ? true : isMonthly,
      maxBaseFee: isClassFee ? 0 : Number(maxBaseFee || 0),
      feeSource,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        },
      }}
      PaperProps={{
        className:
          "bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-300 dark:border-slate-800",
        style: { margin: "16px" },
      }}
    >
      <DialogTitle className="border-b border-slate-200 dark:border-slate-800 p-4">
        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
          {data ? "Edit Fee Category" : "Create New Fee Category"}
        </span>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4 p-6 bg-white dark:bg-slate-900">
          <TextField
            label="Category Name (e.g., Hostel Fee, Exam Fee)"
            fullWidth
            variant="outlined"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            InputLabelProps={{
              className: "text-xs font-medium dark:text-slate-400",
            }}
            inputProps={{
              className: "text-sm text-slate-800 dark:text-slate-100",
            }}
          />

          <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-blue-500" /> Is this
              billed every month?
            </span>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isClassFee ? true : isMonthly}
                  disabled={isClassFee}
                  onChange={(e) => setIsMonthly(e.target.checked)}
                  color="primary"
                />
              }
              label=""
              className="m-0"
            />
          </div>

          <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-500" /> Amount
              comes from Class Fee?
            </span>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isClassFee}
                  disabled={classFeeLockedByOther}
                  onChange={(e) =>
                    setFeeSource(e.target.checked ? "class_fee" : "fixed")
                  }
                  color="primary"
                />
              }
              label=""
              className="m-0"
            />
          </div>
          {classFeeLockedByOther && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-2 ml-1">
              Another category is already linked to Class Fee.
            </p>
          )}

          <TextField
            label={
              isClassFee
                ? "Amount auto from student's Class Fee"
                : "Max Base Fee / Standard Amount (Optional)"
            }
            fullWidth
            variant="outlined"
            size="small"
            type="number"
            placeholder="e.g. 5000"
            value={isClassFee ? "" : maxBaseFee}
            disabled={isClassFee}
            onChange={(e) =>
              setMaxBaseFee(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            InputLabelProps={{
              className: "text-xs font-medium dark:text-slate-400",
            }}
            inputProps={{
              className: "text-sm text-slate-800 dark:text-slate-100",
              min: 0,
            }}
          />
        </DialogContent>

        <DialogActions className="border-t border-slate-200 dark:border-slate-800 p-3 gap-2">
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            variant="ghost"
            className="h-9 cursor-pointer text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="h-9 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white text-xs font-semibold px-4 cursor-pointer"
          >
            {loading ? "Saving..." : data ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}