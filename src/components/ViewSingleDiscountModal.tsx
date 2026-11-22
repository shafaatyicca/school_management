"use client";

import { useState } from "react";
import { Close as CloseIcon, Edit, Delete } from "@mui/icons-material";
import { Receipt, ShieldAlert } from "lucide-react";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { usePermissions } from "@/components/PermissionsProvider";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Zoom,
} from "@mui/material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  schoolId: string;
  classFee: number;
  discounts: any[];
  onEdit: (discount: any) => void;
  onRefresh: () => void;
}

export default function ViewSingleDiscountModal({
  isOpen, onClose, studentId, studentName,
  className, section, schoolId, classFee, discounts, onEdit, onRefresh,
}: Props) {
  // View / Edit / Delete → "Fee Discounts" row in User Access
  const { can } = usePermissions();
  const canView = can("discounts", "view");
  const canEdit = can("discounts", "edit");
  const canDelete = can("discounts", "delete");
  const showActions = canEdit || canDelete;

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setDeletingId(deleteDialog.id);
    try {
      const res = await fetch("/api/Fee_Management/discounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        // Tuition (Class Fee) record is kept — only its discount is removed
        notify.success(
          data?.reset
            ? "Discount removed — fee lock remains"
            : "Discount deleted!",
        );
        onRefresh();
      } else {
        notify.error(data?.message || "Failed to delete");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      // Always close the confirm dialog
      setDeletingId(null);
      setDeleteDialog({ open: false, id: null, name: "" });
    }
  };

  const handleEdit = (discount: any) => {
    onEdit(discount);
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        transitionDuration={200}
        BackdropProps={{
          sx: { backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
            py: 1.5, px: 2,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-bold text-foreground text-sm">View Discounts</p>
          </div>
          <IconButton
            onClick={onClose}
            size="small"
            tabIndex={-1}
            sx={{ color: "var(--muted-foreground)", "&:hover": { backgroundColor: "var(--muted)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* Body */}
        <DialogContent dividers sx={{ backgroundColor: "var(--background)", p: 2 }}>

          {/* Student Info */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-foreground">{studentName}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              {className} {section && `(${section})`}
            </span>
          </div>

          {/* Table */}
          {!canView ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              You don&apos;t have permission to view discounts.
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
              No discounts found for this student.
            </div>
          ) : (
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th className="p-2 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>#</th>
                    <th className="p-2 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>Category</th>
                    <th className="p-2 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Base Fee</th>
                    <th className="p-2 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Discount</th>
                    <th className="p-2 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Net Payable</th>
                    <th className="p-2 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>Remarks</th>
                    {showActions && (
                      <th className="p-2 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((item, index) => {
                    const base     = item.baseFee ?? 0;
                    const net      = item.customNetFee ?? base;
                    const discount = base - net;
                    // Tuition (Class Fee) row = the student's fee lock
                    const isFeeLock = item.feeCategoryId?.feeSource === "class_fee";
                    return (
                      <tr
                        key={item._id}
                        className="border-t"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: index % 2 === 0 ? "var(--card)" : "var(--background)",
                        }}
                      >
                        <td className="p-2 text-foreground">{index + 1}</td>
                        <td className="p-2 font-medium text-foreground">
                          {item.feeCategoryId?.name || "---"}
                        </td>
                        <td className="p-2 text-center text-blue-600 font-medium">
                          {base.toLocaleString()}
                        </td>
                        <td className="p-2 text-center text-pink-500 font-medium">
                          {discount > 0 ? ` ${discount.toLocaleString()}` : "0"}
                        </td>
                        <td className="p-2 text-center text-green-600 font-bold">
                          {net.toLocaleString()}
                        </td>
                        <td className="p-2" style={{ color: "var(--muted-foreground)" }}>
                          {item.remarks || "---"}
                        </td>
                        {showActions && (
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit */}
                              {canEdit && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(item)}
                                  sx={{
                                    color: "#0284c7",
                                    "&:hover": { backgroundColor: "rgba(2,132,199,0.1)" },
                                  }}
                                >
                                  <Edit sx={{ fontSize: 15 }} />
                                </IconButton>
                              )}
                              {/* Delete (on Tuition only the discount is removed) */}
                              {canDelete && (
                                <IconButton
                                  size="small"
                                  title={isFeeLock ? "Remove Discount" : "Delete"}
                                  disabled={
                                    deletingId === item._id || (isFeeLock && discount <= 0)
                                  }
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      id: item._id,
                                      name: isFeeLock
                                        ? `${item.feeCategoryId?.name || ""} discount`
                                        : item.feeCategoryId?.name || "",
                                    })
                                  }
                                  sx={{
                                    color: "#ef4444",
                                    "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                                  }}
                                >
                                  <Delete sx={{ fontSize: 15 }} />
                                </IconButton>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr
                    className="border-t font-bold text-xs"
                    style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
                  >
                    <td className="p-2" colSpan={2} style={{ color: "var(--muted-foreground)" }}>
                      Total
                    </td>
                    <td className="p-2 text-center text-blue-600">
                      {discounts.reduce((sum, d) => sum + (d.baseFee ?? 0), 0).toLocaleString()}
                    </td>
                    <td className="p-2 text-center text-pink-500">
                      {discounts
                        .reduce((sum, d) => sum + ((d.baseFee ?? 0) - (d.customNetFee ?? d.baseFee ?? 0)), 0)
                        .toLocaleString()}
                    </td>
                    <td className="p-2 text-center text-green-600">
                      {discounts.reduce((sum, d) => sum + (d.customNetFee ?? d.baseFee ?? 0), 0).toLocaleString()}
                    </td>
                    <td colSpan={showActions ? 2 : 1} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null, name: "" })}
        onConfirm={handleDelete}
        itemName={deleteDialog.name || "Discount"}
      />
    </>
  );
}