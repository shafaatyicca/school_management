"use client";
import React from "react";
import {
  X as CloseIcon,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import Zoom from "@mui/material/Zoom";

export default function SchoolInvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  school,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  school: any;
}) {
  if (!invoice) return null;

  const paymentLogs = invoice.paymentHistory || invoice.payments || [];
  const feedingAmount =
    invoice.feedingSplit?.month1 || invoice.totalFeedingAmount || 0;
  const discountAmount = invoice.discount || 0;
  const isPaid = invoice.status === "paid";

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
              {school?.name}
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
            {invoice.status}
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
                  {value
                    ? new Date(value).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
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
              {paymentLogs.map((pay: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                    {pay.date || pay.paymentDate
                      ? new Date(
                          pay.date || pay.paymentDate,
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">
                    {(pay.amount || pay.amountPaid || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback single payment date */}
        {paymentLogs.length === 0 && invoice.paidAt && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            Paid on:{" "}
            <strong className="text-emerald-900">
              {new Date(invoice.paidAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
