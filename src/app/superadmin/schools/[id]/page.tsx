"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Trash2, Edit3, CreditCard, Plus } from "lucide-react";
import InvoiceModal from "@/components/superadmin/InvoiceModal";
import PaymentModal from "@/components/superadmin/PaymentModal";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

export default function SchoolBillingPage() {
  const { id } = useParams();
  const [school, setSchool] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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

  const totals = invoices.reduce(
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

      <div className="bg-white border rounded-md overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b">
            <tr>
              <th className="p-2">Inv #</th>
              <th className="p-2">Month</th>
              <th className="p-2">Plan Fee</th>
              <th className="p-2">Feeding</th>
              <th className="p-2">Discount</th>
              <th className="p-2">Total Bill</th>
              <th className="p-2">Paid</th>
              <th className="p-2">Remaining</th>
              <th className="p-2">Status & Date</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {invoices.map((inv) => (
              <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                <td className="p-2 text-indigo-600">{inv.invoiceNumber}</td>
                <td className="p-2 font-medium">{inv.billingMonth}</td>
                <td className="p-2">{inv.planAmount}</td>
                <td className="p-2 text-indigo-500">
                  {inv.feedingSplit?.month1 || inv.totalFeedingAmount}
                </td>
                <td className="p-2 text-orange-400">{inv.discount}</td>
                <td className="p-2 text-slate-900">{inv.finalAmount}</td>
                <td className="p-2 text-emerald-600">{inv.amountPaid}</td>
                <td className="p-2 text-rose-500">{inv.remainingAmount}</td>
                <td className="p-2">
                  <div className="flex flex-col">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase w-fit ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.paidAt && (
                      <span className="text-[10px] text-slate-400 flex items-center">
                        {new Date(inv.paidAt).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right space-x-2">
                  {inv.status !== "paid" && (
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsPaymentModalOpen(true);
                      }}
                      className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                    >
                      <CreditCard size={15} />
                    </button>
                  )}
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
                    onClick={() => deleteInvoice(inv._id, inv.invoiceNumber)}
                    className="text-rose-400 p-1 hover:bg-rose-50 rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold text-sm bg-slate-50">
            <tr>
              <td
                colSpan={2}
                className="p-2 text-right uppercase text-[10px] tracking-widest text-slate-400"
              >
                Grand Total:
              </td>
              <td className="p-2 border-t border-slate-200">{totals.plan}</td>
              <td className="p-2 border-t border-slate-200 text-indigo-500">
                {totals.feeding}
              </td>
              <td className="p-2 border-t border-slate-200 text-orange-400">
                {totals.discount}
              </td>
              <td className="p-2 border-t border-slate-200 text-slate-900">
                {totals.totalBill}
              </td>
              <td className="p-2 border-t border-slate-200 text-emerald-600">
                {totals.paid}
              </td>
              <td className="p-2 border-t border-slate-200 text-rose-500">
                {totals.remaining}
              </td>
              <td
                colSpan={2}
                className="p-2 border-t border-slate-200 text-[10px] text-slate-500 italic"
              >
                All records summary
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
    </div>
  );
}
