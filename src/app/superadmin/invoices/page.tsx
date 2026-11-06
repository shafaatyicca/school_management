"use client";
import React, { useEffect, useState, useMemo } from "react";
import PaymentModal from "@/components/superadmin/PaymentModal";
import InvoiceModal from "@/components/superadmin/InvoiceModal";
import { Select, MenuItem, FormControl, OutlinedInput } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import SchoolInvoicePreviewModal from "@/components/superadmin/SchoolInvoicePreviewModal";
import BulkSchoolInvoiceModal from "@/components/superadmin/BulkSchoolInvoiceModal";
import {
  Zap,
  Trash2,
  CreditCard,
  Edit3,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Chip,
  Box,
  TablePagination,
} from "@mui/material";

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(10);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Modals States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Bulk Form State
  const [bulkData, setBulkData] = useState({ month: "", dueDate: "" });
  const [bulkBillingDate, setBulkBillingDate] = useState<Dayjs | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/invoices");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      notify.error("Fetch Error", "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const name = inv.schoolId?.name || "";
      const invNum = inv.invoiceNumber || "";
      const billingMonth = inv.billingMonth || "";
      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billingMonth.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const paginatedData = useMemo(() => {
    if (rowsPerPage === "all") return filtered;
    return filtered.slice(
      page * Number(rowsPerPage),
      page * Number(rowsPerPage) + Number(rowsPerPage),
    );
  }, [filtered, page, rowsPerPage]);

  // --- FOOTER TOTALS CALCULATION ---
  const totals = useMemo(() => {
    return paginatedData.reduce(
      (acc, inv) => ({
        plan: acc.plan + (inv.planAmount || 0),
        feeding:
          acc.feeding +
          (inv.feedingSplit?.month1 || inv.totalFeedingAmount || 0),
        discount: acc.discount + (inv.discount || 0),
        total: acc.total + (inv.finalAmount || 0),
        paid: acc.paid + (inv.amountPaid || 0),
        pending: acc.pending + (inv.finalAmount - (inv.amountPaid || 0)),
      }),
      { plan: 0, feeding: 0, discount: 0, total: 0, paid: 0, pending: 0 },
    );
  }, [paginatedData]);

  // --- ACTIONS (LOGIC UNCHANGED) ---
  const handleInvoiceEditSubmit = async (formData: any) => {
    if (!selectedInvoice) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/superadmin/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          invoiceId: selectedInvoice._id,
          updatedData: formData,
        }),
      });

      if (res.ok) {
        await fetchInvoices();
        setIsInvoiceModalOpen(false);
        setSelectedInvoice(null);
        notify.success(
          "Invoice Updated!",
          "Invoice has been updated successfully",
        );
      } else {
        const err = await res.json();
        notify.error("Update Failed!", err.error || "Could not update invoice");
      }
    } catch (error) {
      notify.error("Error!", "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkData.month || !bulkData.dueDate)
      return notify.warning(
        "Fields Required",
        "Please fill billing month and due date",
      );
    setIsProcessing(true);
    try {
      const res = await fetch("/api/superadmin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bulk",
          billingMonth: bulkData.month,
          dueDate: bulkData.dueDate,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        fetchInvoices();
        setIsBulkModalOpen(false);
        setBulkData({ month: "", dueDate: "" });
        if (result.skipped > 0) {
          notify.warning("Partially Generated!", result.message);
        } else {
          notify.success("Invoices Generated!", result.message);
        }
      } else {
        notify.error("Failed!", "Could not generate invoices");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedInvoices.length === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/superadmin/invoices?ids=${selectedInvoices.join(",")}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setSelectedInvoices([]);
        fetchInvoices();
        notify.success(
          "Deleted!",
          `${selectedInvoices.length} invoices deleted successfully`,
        );
      } else {
        notify.error("Failed!", "Could not delete invoices");
      }
    } finally {
      setIsProcessing(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await fetch(`/api/superadmin/invoices?id=${deletingId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchInvoices();
      notify.success("Deleted!", `Invoice ${deletingName} has been deleted`);
    } else {
      notify.error("Failed!", "Could not delete invoice");
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <div className="space-y-2 max-w-[1600px] mx-auto pb-48 overflow-x-hidden">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-md border shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by School Name, Invoice Number, & Billing Months"
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-md text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            {" "}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              IconComponent={() => (
                <ChevronDown
                  size={16}
                  className="text-slate-400 mr-2"
                  style={{
                    position: "absolute",
                    right: "8px",
                    pointerEvents: "none",
                  }}
                />
              )}
              input={
                <OutlinedInput
                  sx={{
                    bgcolor: "rgba(248, 250, 252, 0.5)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 400,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e2e8f0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#818cf8",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#818cf8",
                      borderWidth: "1px",
                    },
                    "& .MuiSelect-select": {
                      py: "10px",
                      pl: "12px",
                      pr: "32px !important",
                    },
                  }}
                />
              }
            >
              <MenuItem sx={{ fontSize: "12px" }} value="all">
                All Status
              </MenuItem>
              <MenuItem sx={{ fontSize: "12px" }} value="paid">
                Paid
              </MenuItem>
              <MenuItem sx={{ fontSize: "12px" }} value="pending">
                Pending
              </MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={selectedInvoices.length === 0 || isProcessing}
            onClick={handleBulkDelete}
            className={`px-2 py-2.5 rounded-md text-xs flex items-center gap-2 transition-all border ${
              selectedInvoices.length > 0
                ? "bg-rose-50 text-slate-600 border-rose-100 hover:bg-rose-600 hover:text-white cursor-pointer"
                : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
            }`}
          >
            <Trash2 size={16} /> Bulk Delete{" "}
            {selectedInvoices.length > 0 && `(${selectedInvoices.length})`}
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-slate-900 text-white px-2 py-2.5 rounded-md text-xs hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Zap size={16} fill="white" /> Bulk Generate
          </button>
        </div>
      </div>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "none",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Table sx={{ minWidth: 900 }} size="small" aria-label="invoices table">
          <TableHead sx={{ bgcolor: "#f8fafc", py: 0.3 }}>
            <TableRow
              sx={{
                "& th": { borderBottom: "1px solid #e2e8f0", py: 0.2, px: 0.8 },
              }}
            >
              <TableCell padding="checkbox" align="center">
                <Checkbox
                  size="small"
                  sx={{
                    color: "#6366f1",
                    "&.Mui-checked": { color: "#6366f1" },
                  }}
                  onChange={(e) =>
                    setSelectedInvoices(
                      e.target.checked ? filtered.map((i) => i._id) : [],
                    )
                  }
                />
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                INV #
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                SCHOOL
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                MONTH
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                PLAN FEE
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                FEEDING
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                TOTAL
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                DISCOUNT
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                PAID
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#e11d48",
                }}
              >
                REMAINING
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                STATUS
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                }}
              >
                ACTIONS
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  align="center"
                  sx={{
                    py: 5,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    fontWeight: "bold",
                  }}
                >
                  Fetching latest data...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  align="center"
                  sx={{ py: 5, color: "#94a3b8", fontWeight: "bold" }}
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((inv) => (
                <TableRow
                  key={inv._id}
                  hover
                  sx={{
                    "&:hover": { bgcolor: "#f8fafc" },
                    transition: "colors 0.2s",
                    "& td": { py: 0.3, px: 0.8 },
                  }}
                >
                  <TableCell padding="checkbox" align="center">
                    <Checkbox
                      size="small"
                      checked={selectedInvoices.includes(inv._id)}
                      sx={{
                        color: "#6366f1",
                        "&.Mui-checked": { color: "#6366f1" },
                      }}
                      onChange={() =>
                        setSelectedInvoices((prev) =>
                          prev.includes(inv._id)
                            ? prev.filter((id) => id !== inv._id)
                            : [...prev, inv._id],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#4f46e5",
                      fontSize: "10px",
                    }}
                  >
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      color: "#4f46e5",
                      fontSize: "10px",
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsViewModalOpen(true);
                    }}
                    title="Click to view invoice preview"
                  >
                    {inv.schoolId?.name || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 500, color: "#64748b", fontSize: "10px" }}
                  >
                    {inv.billingMonth}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 500, color: "#475569", fontSize: "10px" }}
                  >
                    {inv.planAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "#6366f1", fontWeight: 500, fontSize: "10px" }}
                  >
                    {(
                      inv.feedingSplit?.month1 ||
                      inv.totalFeedingAmount ||
                      0
                    ).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: 700, color: "#0f172a", fontSize: "10px" }}
                  >
                    {inv.finalAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "#fb923c", fontWeight: 500, fontSize: "10px" }}
                  >
                    {(inv.discount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      color: "#059669",
                      bgcolor: "rgba(16, 185, 129, 0.05)",
                      fontSize: "10px",
                    }}
                  >
                    {(inv.amountPaid || 0).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "10px",
                      color: inv.status === "paid" ? "#cbd5e1" : "#e11d48",
                      bgcolor:
                        inv.status === "paid"
                          ? "transparent"
                          : "rgba(225, 29, 72, 0.05)",
                    }}
                  >
                    {(
                      inv.remainingAmount ??
                      inv.finalAmount - (inv.amountPaid || 0)
                    ).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={inv.status}
                      size="small"
                      sx={{
                        fontSize: "9px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        borderRadius: "10px",
                        border: "1px solid",
                        bgcolor: inv.status === "paid" ? "#ecfdf5" : "#fffbeb",
                        color: inv.status === "paid" ? "#047857" : "#b45309",
                        borderColor:
                          inv.status === "paid" ? "#d1fae5" : "#fef3c7",
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 0.5,
                      }}
                    >
                      {/* View Button - Always visible & centered */}
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsViewModalOpen(true);
                        }}
                        sx={{
                          color: "#64748b",
                          "&:hover": { bgcolor: "#f1f5f9" },
                        }}
                        title="View / Print Invoice"
                      >
                        <Eye size={15} />
                      </IconButton>

                      {/* Paid na hone par baaki buttons show honge */}
                      {inv.status !== "paid" && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPaymentModalOpen(true);
                            }}
                            sx={{
                              color: "#10b981",
                              "&:hover": { bgcolor: "#ecfdf5" },
                            }}
                            title="Record Payment"
                          >
                            <CreditCard size={15} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceModalOpen(true);
                            }}
                            sx={{
                              color: "#2563eb",
                              "&:hover": { bgcolor: "#eff6ff" },
                            }}
                            title="Edit Invoice"
                          >
                            <Edit3 size={14} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setDeletingId(inv._id);
                              setDeletingName(
                                inv.invoiceNumber || "this invoice",
                              );
                              setDeleteDialogOpen(true);
                            }}
                            sx={{
                              color: "#e11d48",
                              "&:hover": { bgcolor: "#fff1f2" },
                            }}
                            title="Delete Invoice"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>

          {/* Footer Logic for Grand Totals */}
          <TableHead
            sx={{ bgcolor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}
          >
            <TableRow
              sx={{
                "& td": {
                  fontWeight: "bold",
                  py: 0.5,
                  px: 0.8,
                  fontSize: "10px",
                },
              }}
            >
              {/* Left Side: Rows per page + Count text */}
              <TableCell colSpan={4} align="left">
                <div className="flex items-center gap-3 text-[11px] font-normal text-slate-600">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Rows Per Page:
                    </span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRowsPerPage(val === "all" ? "all" : Number(val));
                        setPage(0);
                      }}
                      className="border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white outline-none cursor-pointer font-medium"
                    >
                      {[10, 25, 50, 75, 100, "all"].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "all" ? "All" : opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="whitespace-nowrap text-slate-500 font-medium">
                    {filtered.length === 0
                      ? "0 records"
                      : rowsPerPage === "all"
                        ? `1–${filtered.length} of ${filtered.length}`
                        : `${page * Number(rowsPerPage) + 1}–${Math.min((page + 1) * Number(rowsPerPage), filtered.length)} of ${filtered.length}`}
                  </span>
                </div>
              </TableCell>

              {/* Grand Totals Columns */}
              <TableCell align="center">
                {totals.plan.toLocaleString()}
              </TableCell>
              <TableCell align="center" sx={{ color: "#6366f1" }}>
                {totals.feeding.toLocaleString()}
              </TableCell>
              <TableCell align="center" sx={{ color: "#0f172a" }}>
                {totals.total.toLocaleString()}
              </TableCell>
              <TableCell align="center" sx={{ color: "#fb923c" }}>
                {totals.discount.toLocaleString()}
              </TableCell>
              <TableCell align="center" sx={{ color: "#10b981" }}>
                {totals.paid.toLocaleString()}
              </TableCell>
              <TableCell align="center" sx={{ color: "#e11d48" }}>
                {totals.pending.toLocaleString()}
              </TableCell>

              {/* Status Column space */}
              <TableCell
                align="center"
                sx={{ color: "#94a3b8", fontStyle: "italic" }}
              >
                Summary
              </TableCell>

              {/* Right Side: Only Pagination Arrow Buttons */}
              <TableCell align="right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={rowsPerPage === "all" || page === 0}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          Math.ceil(filtered.length / Number(rowsPerPage)) - 1,
                          p + 1,
                        ),
                      )
                    }
                    disabled={
                      rowsPerPage === "all" ||
                      page >=
                        Math.ceil(filtered.length / Number(rowsPerPage)) - 1 ||
                      filtered.length === 0
                    }
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* --- MODALS --- */}
      {isInvoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoice(null);
          }}
          initialData={selectedInvoice}
          onSubmit={handleInvoiceEditSubmit}
          mode="edit"
        />
      )}
      {isPaymentModalOpen && selectedInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onPaid={() => {
            fetchInvoices();
            setIsPaymentModalOpen(false);
            notify.success(
              "Payment Received!",
              "Payment has been recorded successfully",
            );
          }}
        />
      )}
      {selectedInvoice && (
        <SchoolInvoicePreviewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          school={selectedInvoice.schoolId}
        />
      )}

      <BulkSchoolInvoiceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        bulkData={bulkData}
        setBulkData={setBulkData}
        bulkBillingDate={bulkBillingDate}
        setBulkBillingDate={setBulkBillingDate}
        onSubmit={handleBulkGenerate}
        isProcessing={isProcessing}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingName}
      />

      <DeleteConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        itemName={`${selectedInvoices.length} selected invoices`}
      />
    </div>
  );
}
