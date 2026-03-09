"use client";
import React, { useEffect, useState, useMemo } from "react";
import PaymentModal from "@/components/superadmin/PaymentModal";
import InvoiceModal from "@/components/superadmin/InvoiceModal";
import { Select, MenuItem, FormControl, OutlinedInput } from "@mui/material";
import {
  Zap,
  Trash2,
  CreditCard,
  Edit3,
  X,
  Search,
  ChevronDown,
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
} from "@mui/material";

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Modals States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk Form State
  const [bulkData, setBulkData] = useState({ month: "", dueDate: "" });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/invoices");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
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
      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invNum.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // --- FOOTER TOTALS CALCULATION ---
  const totals = useMemo(() => {
    return filtered.reduce(
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
  }, [filtered]);

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
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkData.month || !bulkData.dueDate) return alert("Fields required");
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
        alert(result.message);
        fetchInvoices();
        setIsBulkModalOpen(false);
        setBulkData({ month: "", dueDate: "" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Delete ${selectedInvoices.length} selected invoices?`))
      return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/superadmin/invoices?ids=${selectedInvoices.join(",")}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setSelectedInvoices([]);
        fetchInvoices();
        alert("Deleted Successfully");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className=" space-y-2 max-w-[1600px] mx-auto pb-48">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-md border shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search school or invoice..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-md text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
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
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={selectedInvoices.length === 0 || isProcessing}
            onClick={handleBulkDelete}
            className={`px-2 py-2.5 rounded-md text-xs flex items-center gap-2 transition-all border ${
              selectedInvoices.length > 0
                ? "bg-rose-50 text-slate-600 border-rose-100 hover:bg-rose-600 hover:text-rose-600 cursor-pointer"
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
        }}
      >
        <Table sx={{ minWidth: 1100 }} size="small" aria-label="invoices table">
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow
              sx={{ "& th": { borderBottom: "1px solid #e2e8f0", py: 0.5 } }}
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
                  letterSpacing: "0.1em",
                }}
              >
                INV #
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                SCHOOL
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                MONTH
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                PLAN FEE
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                FEEDING
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "black",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                TOTAL
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                DISCOUNT
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#10b981",
                  letterSpacing: "0.1em",
                }}
              >
                PAID
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#e11d48",
                  letterSpacing: "0.1em",
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
                  letterSpacing: "0.1em",
                }}
              >
                STATUS
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#64748b",
                  letterSpacing: "0.1em",
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
              filtered.map((inv) => (
                <TableRow
                  key={inv._id}
                  hover
                  sx={{
                    "&:hover": { bgcolor: "#f8fafc" },
                    transition: "colors 0.2s",
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
                      fontSize: "12px",
                    }}
                  >
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600, color: "#334155", fontSize: "12px" }}
                  >
                    {inv.schoolId?.name || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 500, color: "#64748b", fontSize: "12px" }}
                  >
                    {inv.billingMonth}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 500, color: "#475569", fontSize: "12px" }}
                  >
                    {inv.planAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "#6366f1", fontWeight: 500, fontSize: "12px" }}
                  >
                    {(
                      inv.feedingSplit?.month1 ||
                      inv.totalFeedingAmount ||
                      0
                    ).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}
                  >
                    {inv.finalAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "#fb923c", fontWeight: 500, fontSize: "12px" }}
                  >
                    {(inv.discount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: "bold",
                      color: "#059669",
                      bgcolor: "rgba(16, 185, 129, 0.05)",
                      fontSize: "12px",
                    }}
                  >
                    {(inv.amountPaid || 0).toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "12px",
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
                        fontSize: "10px",
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
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      {inv.status !== "paid" && (
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
                        >
                          <CreditCard size={16} />
                        </IconButton>
                      )}
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
                      >
                        <Edit3 size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          if (confirm("Delete?")) {
                            await fetch(
                              `/api/superadmin/invoices?id=${inv._id}`,
                              { method: "DELETE" },
                            );
                            fetchInvoices();
                          }
                        }}
                        sx={{
                          color: "#e11d48",
                          "&:hover": { bgcolor: "#fff1f2" },
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
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
              sx={{ "& td": { fontWeight: "bold", py: 2, fontSize: "13px" } }}
            >
              <TableCell
                colSpan={4}
                align="right"
                sx={{
                  color: "#94a3b8",
                  fontSize: "10px !important",
                  letterSpacing: "0.1em",
                }}
              >
                GRAND TOTALS:
              </TableCell>
              <TableCell align="right">
                {totals.plan.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ color: "#6366f1" }}>
                {totals.feeding.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ color: "#0f172a" }}>
                {totals.total.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ color: "#fb923c" }}>
                {totals.discount.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ color: "#10b981" }}>
                {totals.paid.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ color: "#e11d48" }}>
                {totals.pending.toLocaleString()}
              </TableCell>
              <TableCell
                colSpan={2}
                sx={{
                  fontSize: "10px !important",
                  color: "#94a3b8",
                  fontStyle: "italic",
                  fontWeight: "normal !important",
                }}
              >
                Filtered summary
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
          }}
        />
      )}

      {/* Bulk Generate Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4 transition-all duration-300">
          <div className="bg-white rounded-md p-4 w-full max-w-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl  text-slate-800 flex items-center gap-2">
                  <Zap
                    className="text-indigo-600 drop-shadow-sm"
                    size={22}
                    fill="currentColor"
                  />
                  Bulk Generate
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <X
                  className="text-slate-400 group-hover:text-rose-500 transition-colors cursor-pointer"
                  size={20}
                />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[12px] text-slate-800 ml-1 uppercase">
                  Billing Month
                </label>
                <input
                  type="text"
                  placeholder="e.g. March 2026"
                  className="mt-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium text-slate-700"
                  value={bulkData.month}
                  onChange={(e) =>
                    setBulkData({ ...bulkData, month: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5 mt-4">
                <label className="text-[12px] text-slate-800 ml-1 uppercase">
                  Due Date
                </label>
                <input
                  type="date"
                  className="mt-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium text-slate-700 cursor-pointer"
                  value={bulkData.dueDate}
                  onChange={(e) =>
                    setBulkData({ ...bulkData, dueDate: e.target.value })
                  }
                />
              </div>

              {/* Generate Button */}
              <button
                disabled={isProcessing}
                onClick={handleBulkGenerate}
                className="w-full mt-4 py-4 bg-slate-900 text-white rounded-md text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    PROCESSING...
                  </span>
                ) : (
                  "GENERATE INVOICES"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
