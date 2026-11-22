"use client";

import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { usePermissions } from "@/components/PermissionsProvider";
import { WidgetCard, EmptyNote, money, pkTime } from "./ui";

const METHOD_STYLE: Record<string, string> = {
  cash: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  bank: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  online: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

export default function RecentPayments({ data, className = "" }: { data: any; className?: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canOpenLedger = can("fees", "view");
  const payments: any[] = data?.payments || [];

  return (
    <WidgetCard
      title="Today's Payments"
      icon={ReceiptText}
      accent="sky"
      bodyClass="p-0"
      className={className}
      action={
        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">
          {payments.length}
        </span>
        // "View all" → Daily Collection page (will be added when that page exists)
      }
    >
      {payments.length === 0 ? (
        <EmptyNote>No payments received today.</EmptyNote>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1 font-semibold">Receipt</th>
                <th className="px-2 py-1 text-left">GR #</th>
                <th className="px-2 py-1 font-semibold">Student</th>
                <th className="px-2 py-1 text-right font-semibold">Amount</th>
                <th className="px-2 py-1 font-semibold">Method</th>
                <th className="hidden px-2 py-1 font-semibold md:table-cell">Received by</th>
                <th className="px-2 py-1 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-2 py-1 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                    {p.paymentNo || "---"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-muted-foreground">
                    {p.grNumber !== "" && p.grNumber != null ? p.grNumber : "—"}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {canOpenLedger ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/student-fee-ledger?student=${p.studentId}`)}
                        className="text-left font-medium text-foreground hover:text-sky-600 hover:underline cursor-pointer"
                      >
                        {p.studentName}
                      </button>
                    ) : (
                      <span className="font-medium text-foreground">{p.studentName}</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-bold text-foreground">{money(p.amount)}</td>
                  <td className="px-2 py-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold capitalize ${
                        METHOD_STYLE[p.method] || METHOD_STYLE.cash
                      }`}
                    >
                      {p.method}
                    </span>
                  </td>
                  <td className="hidden px-2 py-1 text-muted-foreground md:table-cell">
                    {p.receivedBy || "---"}
                  </td>
                  <td className="px-2 py-1 text-right text-muted-foreground">{pkTime(p.enteredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}