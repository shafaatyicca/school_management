"use client";

import {
  Dialog, DialogTitle, DialogContent,
  IconButton, Zoom,
} from "@mui/material";
import React from "react";
import { Close as CloseIcon } from "@mui/icons-material";
import { FileText, User, Receipt, CreditCard, Clock } from "lucide-react";

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  studentInfo: any;
}

export default function InvoiceDetailModal({
  isOpen, onClose, invoice, studentInfo,
}: Props) {
  if (!invoice) return null;

  const statusConfig: any = {
    paid:    { label: "Paid",    cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" },
    partial: { label: "Partial", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    pending: { label: "Pending", cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
  };

  const status = statusConfig[invoice.status] || statusConfig.pending;

  return (
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
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-none">
              Invoice Detail
            </p>
            
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${status.cls}`}>
            {status.label}
          </span>
          <IconButton
            onClick={onClose}
            size="small"
            tabIndex={-1}
            sx={{ color: "var(--muted-foreground)", "&:hover": { backgroundColor: "var(--muted)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      {/* Body */}
      <DialogContent dividers sx={{ backgroundColor: "var(--background)", p: 1 }}>
        <div className="flex flex-col gap-2">

          {/* Student Info */}
          <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-3 py-1 flex items-center gap-2 border-b" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
              <User className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                Student Info
              </p>
            </div>
            <table className="w-full text-xs border-collapse" style={{ backgroundColor: "var(--card)" }}>
                <tbody>
                    {[
                    [
                        { label: "Student",
                            value: `${studentInfo?.fullName} (GR# ${studentInfo?.grNumber})`,
                            color: "text-sky-600", },
                            { label: "Class",  value: `${studentInfo?.className} (${studentInfo?.section})`, color: "" },
                    ],
                    [
                        { label: "Parent", value: studentInfo?.parentName, color: "text-sky-600" },
                        { label: "Phone",  value: studentInfo?.parentPhone, color: "" },
                    ],
                    ].map((row, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: "var(--border)", backgroundColor: i % 2 === 0 ? "var(--card)" : "var(--muted)" }}>
                        {row.map((item, itemIndex) => (
                        <React.Fragment key={`${i}-${itemIndex}`}>
                            <td key={`label-${item.label}`} className="px-3 py-1.5 w-16 font-bold text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            {item.label}
                            </td>
                            <td key={`value-${item.label}`} className={`px-3 py-1.5 font-semibold border-r ${item.color || "text-foreground"}`} style={{ borderColor: "var(--border)" }}>
                            {item.value || "---"}
                            </td>
                        </React.Fragment>
                        ))}
                    </tr>
                    ))}
                </tbody>
                </table>
          </div>

          {/* Fee + Payment Summary — side by side */}
          <div className="grid grid-cols-2 gap-2">

            {/* Fee Details */}
            <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="px-3 py-1 flex items-center gap-2 border-b" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  Fee Details
                </p>
              </div>
              <div className="p-3 space-y-2" style={{ backgroundColor: "var(--card)" }}>
                <div>
                  <p className="text-[10px] flex justify-between" style={{ color: "var(--muted-foreground)" }}>Category: 
                    <span className="text-xs font-semibold text-foreground">{invoice.categoryName}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] flex justify-between" style={{ color: "var(--muted-foreground)" }}>Month:
                    <span className="text-xs font-semibold text-foreground"> {MONTHS[invoice.month]} {invoice.year}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] flex justify-between" style={{ color: "var(--muted-foreground)" }}>Invoice Date:
                    <span className="text-xs font-semibold text-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <div className="border-t pt-2 space-y-1.5" style={{ borderColor: "var(--border)" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--muted-foreground)" }}>Total Amount</span>
                    <span className="font-bold text-blue-600">
                      {invoice.baseFee?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--muted-foreground)" }}>Discount</span>
                    <span className="font-bold text-pink-500">
                       {invoice.discount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs border-t pt-1.5 font-bold" style={{ borderColor: "var(--border)" }}>
                    <span className="text-foreground">Net Payable</span>
                    <span className="text-foreground">{invoice.netPayable?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="px-3 py-1 flex items-center gap-2 border-b" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                <CreditCard className="w-3.5 h-3.5 text-green-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-500">
                  Payment Summary
                </p>
              </div>
              <div className="p-2 space-y-3" style={{ backgroundColor: "var(--card)" }}>

                {/* Net Payable big box */}
                <div className="rounded-lg p-1 text-center border" style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Net Payable</p>
                  <p className="text-md font-black text-foreground">{invoice.netPayable?.toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-1 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-[10px] text-green-600 dark:text-green-400">Paid</p>
                    <p className="text-sm font-black text-green-600 dark:text-green-400">
                      {invoice.paidAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg p-1 text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-[10px] text-red-500">Remaining</p>
                    <p className="text-sm font-black text-red-500">
                      {invoice.remainingAmount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--muted-foreground)" }}>
                  <span>Payment Progress</span>
                  <span>{invoice.netPayable > 0 ? Math.round((invoice.paidAmount / invoice.netPayable) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
  className="h-full rounded-full transition-all duration-500"
  style={{
    width: `${invoice.netPayable > 0
      ? Math.min(100, Math.round((invoice.paidAmount / invoice.netPayable) * 100))
      : 0}%`,
    backgroundColor: invoice.status === "paid" ? "#22c55e" : "#f59e0b" // Green agar Paid, Amber agar Partial
  }}
/>
                </div>
              </div>

              </div>
            </div>

          </div>

          {/* Payment History */}
          {invoice.paymentHistory?.length > 0 && (
            <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="px-3 py-1 flex items-center gap-2 border-b" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  Payment History
                </p>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {invoice.paymentHistory.length} payment{invoice.paymentHistory.length > 1 ? "s" : ""}
                </span>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)" }}>
                    <th className="p-1 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>#</th>
                    <th className="p-1 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>Date</th>
                    <th className="p-1 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Amount</th>
                    <th className="p-1 text-center font-bold" style={{ color: "var(--muted-foreground)" }}>Method</th>
                    <th className="p-1 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>Note</th>
                    <th className="p-1 text-left font-bold" style={{ color: "var(--muted-foreground)" }}>Received By</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.paymentHistory.map((pay: any, i: number) => (
                    <tr
                      key={i}
                      className="border-t"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: i % 2 === 0 ? "var(--card)" : "var(--muted)",
                      }}
                    >
                      <td className="p-1 text-foreground">{i + 1}</td>
                      <td className="p-1 text-foreground">
                        {new Date(pay.paidDate).toLocaleDateString()}
                      </td>
                      <td className="p-1 text-center text-green-600 font-bold">
                        {pay.amount?.toLocaleString()}
                      </td>
                      <td className="p-1 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 capitalize">
                          {pay.method}
                        </span>
                      </td>
                      <td className="p-1" style={{ color: "var(--muted-foreground)" }}>
                        {pay.note || "---"}
                      </td>
                      <td className="p-1" style={{ color: "var(--muted-foreground)" }}>
                        {pay.receivedBy?.name || "---"}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}