"use client";
import React, { useEffect, useState } from "react";
import {
  X as CloseIcon,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import Zoom from "@mui/material/Zoom";
import { notify } from "@/lib/notify";

// Date in Pakistan time, e.g. 20 Nov 2026
const pkDate = (d: any) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

export default function SchoolInvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  school,
  onReversed,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  school: any;
  // Given → each payment gets a "Reverse" button (Super Admin pages)
  onReversed?: (updatedInvoice: any) => void;
}) {
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Close the reverse box when another invoice opens / modal closes
  useEffect(() => {
    setReversingId(null);
    setReason("");
  }, [isOpen, invoice?._id]);

  if (!invoice) return null;

  const paymentLogs = invoice.paymentHistory || invoice.payments || [];
  const reversals = invoice.reversals || [];
  const feedingAmount =
    invoice.feedingSplit?.month1 || invoice.totalFeedingAmount || 0;
  const discountAmount = invoice.discount || 0;
  const isPaid = invoice.status === "paid";
  const canReverse = !!onReversed;

  const reverse = async (paymentId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/superadmin/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse",
          invoiceId: invoice._id,
          paymentId,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify.error("Reverse Failed", data.error || "Could not reverse the payment");
        return;
      }
      setReversingId(null);
      setReason("");
      onReversed?.(data);
    } catch {
      notify.error("Error!", "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Zoom}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        className: "rounded-2xl overflow-hidden shadow-2xl",
      }}
    >
      {/* ── Header ── */}
      <DialogTitle className="relative bg-[#1e1b4b] text-white p-4 flex flex-col gap-3">
        {/* Top Bar: Month & Inv# (Left) + Close Button (Right) */}
        <div className="flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-200">
              <Calendar size={11} className="text-indigo-300" />
              Month: {invoice.billingMonth}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] font-mono font-medium text-indigo-300/80">
              Invoice#: {invoice.invoiceNumber}
            </span>
          </div>

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "#ffffff",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
              p: "6px",
            }}
          >
            <CloseIcon size={10} />
          </IconButton>
        </div>

        {/* Middle Bar: School Details (Left) & Status Badge (Right) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <h2 className="font-bold text-white text-base leading-tight uppercase">
              {school?.name || "Deleted school"}
            </h2>
            <p className="text-[10px] text-indigo-200/60 mt-0.5">
              {school?.address}
              {school?.phone ? ` · ${school.phone}` : ""}
            </p>
          </div>

          {/* Right Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
              isPaid
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                : "bg-amber-400/10 text-amber-300 border border-amber-400/30"
            }`}
          >
            {isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
            {String(invoice.status || "").replace("_", " ")}
          </span>
        </div>
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent dividers className="p-4 flex flex-col gap-3 bg-white">
        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Total Bill",
              value: invoice.finalAmount,
              variant: "default",
            },
            { label: "Paid", value: invoice.amountPaid, variant: "green" },
            {
              label: "Balance",
              value: invoice.remainingAmount,
              variant: (invoice.remainingAmount ?? 0) > 0 ? "red" : "default",
            },
          ].map(({ label, value, variant }) => (
            <div
              key={label}
              className={`text-center rounded-xl p-2.5 border ${
                variant === "green"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : variant === "red"
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <div
                className={`text-[8px] font-bold uppercase tracking-wider mb-1 ${
                  variant === "green"
                    ? "text-emerald-600"
                    : variant === "red"
                      ? "text-rose-500"
                      : "text-slate-400"
                }`}
              >
                {label}
              </div>
              <div className="text-sm font-extrabold tabular-nums">
                {value?.toLocaleString() ?? "0"}
              </div>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Invoice Created",
              value: invoice.createdAt,
              color: "text-slate-700",
            },
            {
              label: "Expiry Date",
              value: invoice.dueDate,
              color: "text-rose-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl p-2.5 border border-slate-200 bg-slate-50"
            >
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </span>
                <span className={`text-xs font-bold ${color}`}>
                  {value ? pkDate(value) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Fee Breakdown */}
        <div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Fee Breakdown
            <span className="flex-1 h-px bg-slate-200" />
          </div>
          <table className="w-full border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold tracking-wider">
                <th className="py-2 px-3 text-left">Description</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr>
                <td className="py-2.5 px-3">Monthly Fee</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                  {invoice.planAmount?.toLocaleString()}
                </td>
              </tr>
              {feedingAmount > 0 && (
                <tr>
                  <td className="py-2.5 px-3">Feeding Fee</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                    {feedingAmount.toLocaleString()}
                  </td>
                </tr>
              )}
              {discountAmount > 0 && (
                <tr>
                  <td className="py-2.5 px-3">Discount</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                    {discountAmount.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <td className="py-2.5 px-3">Total</td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {invoice.finalAmount?.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment History */}
        {paymentLogs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Payment History
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              {paymentLogs.map((pay: any, idx: number) => {
                const pid = pay._id ? String(pay._id) : "";
                const open = !!pid && reversingId === pid;
                const amount = pay.amount || pay.amountPaid || 0;
                return (
                  <div
                    key={pid || pay.paymentNo || idx}
                    className={`rounded-xl border overflow-hidden transition-colors ${
                      open ? "border-rose-200" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                        {pay.paymentNo && (
                          <span className="font-mono text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                            {pay.paymentNo}
                          </span>
                        )}
                        {pay.date || pay.paymentDate
                          ? pkDate(pay.date || pay.paymentDate)
                          : "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 tabular-nums">
                          {amount.toLocaleString()}
                        </span>
                        {canReverse && pid && !open && (
                          <button
                            type="button"
                            onClick={() => {
                              setReversingId(pid);
                              setReason("");
                            }}
                            title="Reverse this payment"
                            className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Undo2 size={10} /> Reverse
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Confirm box with reason */}
                    {open && (
                      <div className="border-t border-rose-100 bg-rose-50/60 p-2.5 space-y-2">
                        <p className="text-[10px] text-rose-700">
                          Reverse {pay.paymentNo || "this payment"} of Rs{" "}
                          {amount.toLocaleString()}? The amount goes back to the balance.
                        </p>
                        <input
                          autoFocus
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason (e.g. wrong amount entered)"
                          className="w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-rose-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReversingId(null)}
                            disabled={busy}
                            className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => reverse(pid)}
                            disabled={busy || reason.trim().length < 3}
                            className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busy ? "Reversing..." : "Confirm Reverse"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback single payment date */}
        {paymentLogs.length === 0 && invoice.paidAt && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            Paid on:{" "}
            <strong className="text-emerald-900">{pkDate(invoice.paidAt)}</strong>
          </div>
        )}

        {/* Reversed payments (record) */}
        {reversals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Reversed Payments
              <span className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              {reversals.map((r: any, idx: number) => (
                <div
                  key={r._id || idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-[11px] text-slate-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {r.paymentNo && (
                        <span className="font-mono text-[10px] line-through">{r.paymentNo}</span>
                      )}
                      {r.date ? pkDate(r.date) : "—"}
                    </span>
                    <span className="font-bold line-through tabular-nums">
                      {Number(r.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1">
                    Reversed {r.reversedAt ? pkDate(r.reversedAt) : ""}
                    {r.by ? ` by ${r.by}` : ""} · {r.reason || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}