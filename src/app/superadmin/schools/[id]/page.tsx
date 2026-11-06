"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Trash2,
  Edit3,
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import InvoiceModal from "@/components/superadmin/InvoiceModal";
import PaymentModal from "@/components/superadmin/PaymentModal";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import SchoolInvoicePreviewModal from "@/components/superadmin/SchoolInvoicePreviewModal";

export default function SchoolBillingPage() {
  const { id } = useParams();
  const [school, setSchool] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(10);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Delete Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, iRes] = await Promise.all([
        fetch(`/api/superadmin/schools?id=${id}&t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(`/api/superadmin/invoices?schoolId=${id}&t=${Date.now()}`, {
          cache: "no-store",
        }),
      ]);
      setSchool(await sRes.json());
      setInvoices(await iRes.json());
    } finally {
      setLoading(false);
    }
  };

  const paginatedData = useMemo(() => {
    if (rowsPerPage === "all") return invoices;
    return invoices.slice(
      page * Number(rowsPerPage),
      page * Number(rowsPerPage) + Number(rowsPerPage),
    );
  }, [invoices, page, rowsPerPage]);

  const totals = paginatedData.reduce(
    (acc, inv) => {
      return {
        plan: acc.plan + (inv.planAmount || 0),
        feeding:
          acc.feeding +
          (inv.feedingSplit?.month1 || inv.totalFeedingAmount || 0),
        discount: acc.discount + (inv.discount || 0),
        totalBill: acc.totalBill + (inv.finalAmount || 0),
        paid: acc.paid + (inv.amountPaid || 0),
        remaining: acc.remaining + (inv.remainingAmount || 0),
      };
    },
    { plan: 0, feeding: 0, discount: 0, totalBill: 0, paid: 0, remaining: 0 },
  );

  const handleInvoiceSubmit = async (formData: any) => {
    const method = selectedInvoice ? "PUT" : "POST";
    const payload = selectedInvoice
      ? {
          action: "edit",
          invoiceId: selectedInvoice._id,
          updatedData: formData,
        }
      : { ...formData, schoolId: id };

    const res = await fetch("/api/superadmin/invoices", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setIsInvoiceModalOpen(false);
      setSelectedInvoice(null);
      await fetchData();
      notify.success(
        selectedInvoice ? "Invoice Updated!" : "Invoice Created!",
        selectedInvoice
          ? "Invoice updated successfully"
          : "New invoice created successfully",
      );
    } else {
      notify.error("Failed!", "Could not save invoice");
    }
  };

  const handlePaymentSubmit = async (
    invoiceId: string,
    amount: number,
    date: string,
  ) => {
    const res = await fetch("/api/superadmin/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pay",
        invoiceId,
        amountToPay: amount,
        paymentDate: date,
      }),
    });
    if (res.ok) {
      setIsPaymentModalOpen(false);
      notify.success(
        "Payment Recorded!",
        "Payment has been saved successfully",
      );
      setTimeout(async () => {
        await fetchData();
      }, 300);
    } else {
      notify.error("Failed!", "Could not record payment");
    }
  };

  const deleteInvoice = (invoiceId: string, invoiceNumber: string) => {
    setDeletingId(invoiceId);
    setDeletingName(invoiceNumber);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await fetch(`/api/superadmin/invoices?id=${deletingId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchData();
      notify.success("Deleted!", `Invoice ${deletingName} has been deleted`);
    } else {
      notify.error("Failed!", "Could not delete invoice");
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  if (loading || !school)
    return <div className="p-20 text-center font-bold">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-white p-2 rounded-md border shadow-sm">
        <div>
          <h1 className="font-bold text-slate-800 uppercase">{school.name}</h1>
          <p className="text-slate-500 text-sm italic">
            {school.address}
            <span className="text-xs text-slate-400"> {school.phone}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedInvoice(null);
            setIsInvoiceModalOpen(true);
          }}
          className="bg-slate-900 text-white p-1.5 rounded-md flex items-center gap-1 hover:bg-indigo-600 transition-all cursor-pointer text-sm"
        >
          <Plus size={15} /> New Invoice
        </button>
      </div>
      <div className="bg-white border rounded-md overflow-hidden shadow-sm px-2">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
            <tr>
              <th className="p-1">S#</th>
              <th className="p-1">InvOICE #</th>
              <th className="p-1">Month</th>
              <th className="p-1">Plan Fee</th>
              <th className="p-1">Feeding</th>
              <th className="p-1">Discount</th>
              <th className="p-1">Total Bill</th>
              <th className="p-1">Paid Amount</th>
              <th className="p-1">Remaining</th>
              <th className="p-1">Status</th>
              <th className="p-1">Paid At</th>
              <th className="p-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-[12px]">
            {paginatedData.map((inv, index) => (
              <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                <td className="p-1 text-slate-500 font-medium">
                  {rowsPerPage === "all"
                    ? index + 1
                    : page * Number(rowsPerPage) + index + 1}
                </td>
                <td className="p-1 text-indigo-600">{inv.invoiceNumber}</td>
                <td
                  className="p-1 font-medium text-indigo-600 cursor-pointer hover:underline"
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setIsViewModalOpen(true);
                  }}
                  title="Click to view invoice preview"
                >
                  {inv.billingMonth}
                </td>
                <td className="p-1">{inv.planAmount.toLocaleString()}</td>
                <td className="p-1 text-indigo-500">
                  {inv.feedingSplit?.month1 || inv.totalFeedingAmount}
                </td>
                <td className="p-1 text-orange-400">
                  {inv.discount.toLocaleString()}
                </td>
                <td className="p-1 text-slate-900">
                  {inv.finalAmount.toLocaleString()}
                </td>
                <td className="p-1 text-emerald-600">
                  {inv.amountPaid.toLocaleString()}
                </td>
                <td className="p-1 text-rose-500">
                  {inv.remainingAmount.toLocaleString()}
                </td>
                <td className="p-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase w-fit ${
                      inv.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="p-1 text-[11px] text-slate-500">
                  {inv.paidAt
                    ? new Date(inv.paidAt).toLocaleDateString("en-GB")
                    : "-"}
                </td>
                <td className="p-1 text-right space-x-2">
                  <button
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsViewModalOpen(true);
                    }}
                    className="text-slate-500 p-1 hover:bg-slate-100 rounded cursor-pointer"
                    title="View / Print Invoice"
                  >
                    <Eye size={15} />
                  </button>

                  {/* Agar status paid nahi hai, tabhi baaki buttons show honge */}
                  {inv.status !== "paid" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsPaymentModalOpen(true);
                        }}
                        className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                      >
                        <CreditCard size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsInvoiceModalOpen(true);
                        }}
                        className="text-blue-500 p-1 hover:bg-blue-50 rounded"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() =>
                          deleteInvoice(inv._id, inv.invoiceNumber)
                        }
                        className="text-rose-400 p-1 hover:bg-rose-50 rounded"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold text-sm bg-slate-50">
            <tr>
              {/* Left Side: Page summary (Covers Inv # & Month -> colSpan={2}) */}
              <td
                colSpan={3}
                className="p-1 border-t border-slate-200 text-[10px] text-slate-500 italic"
              >
                Page summary
              </td>

              {/* Grand Totals */}
              <td className="p-1 border-t border-slate-200">
                {totals.plan.toLocaleString()}
              </td>
              <td className="p-1 border-t border-slate-200 text-indigo-500">
                {totals.feeding.toLocaleString()}
              </td>
              <td className="p-1 border-t border-slate-200 text-orange-400">
                {totals.discount.toLocaleString()}
              </td>
              <td className="p-1 border-t border-slate-200 text-slate-900">
                {totals.totalBill.toLocaleString()}
              </td>
              <td className="p-1 border-t border-slate-200 text-emerald-600">
                {totals.paid.toLocaleString()}
              </td>
              <td className="p-1 border-t border-slate-200 text-rose-500">
                {totals.remaining.toLocaleString()}
              </td>

              {/* Merged Last 3 Columns (Status, Paid At, Actions -> colSpan={3}) */}
              <td colSpan={3} className="p-1 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2 text-[11px] font-normal text-slate-600 px-1">
                  {/* Rows Selector & Count Text */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        Rows per page:
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
                      {invoices.length === 0
                        ? "0 records"
                        : rowsPerPage === "all"
                          ? `1–${invoices.length} of ${invoices.length}`
                          : `${page * Number(rowsPerPage) + 1}–${Math.min((page + 1) * Number(rowsPerPage), invoices.length)} of ${invoices.length}`}
                    </span>
                  </div>

                  {/* Pagination Arrow Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={rowsPerPage === "all" || page === 0}
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm text-slate-600"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setPage((p) =>
                          Math.min(
                            Math.ceil(invoices.length / Number(rowsPerPage)) -
                              1,
                            p + 1,
                          ),
                        )
                      }
                      disabled={
                        rowsPerPage === "all" ||
                        page >=
                          Math.ceil(invoices.length / Number(rowsPerPage)) -
                            1 ||
                        invoices.length === 0
                      }
                      className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm text-slate-600"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handleInvoiceSubmit}
        initialData={selectedInvoice}
        schoolPrice={school.customPrice}
        allInvoices={invoices}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={selectedInvoice}
        onPaid={() => {
          fetchData();
          notify.success(
            "Payment Received!",
            "Payment has been recorded successfully",
          );
        }}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingName}
      />

      <SchoolInvoicePreviewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        school={school}
      />
    </div>
  );
}
