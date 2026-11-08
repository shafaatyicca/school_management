"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Zoom,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { History, Trash2, CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const fmtDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "---";

// Project ka dark mode pehchano (<html> ya <body> par "dark" class)
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const check = () =>
      setIsDark(html.classList.contains("dark") || body.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    observer.observe(body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Box mein kahin bhi click → browser ka calendar khule
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try {
    (e.currentTarget as any).showPicker?.();
  } catch {
    // purane browsers: normal behaviour
  }
};

/**
 * Date box: "FROM  07 Nov 2026  📅"
 * Dikhne wala box hum banate hain (month words mein),
 * asal native date input us ke upar invisible hai — click par browser calendar khulta hai.
 */
function DateBox({
  label,
  value,
  min,
  max,
  onChange,
  isDark,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <div className="group relative h-8 w-[180px]">
      {/* Dikhne wala box */}
      <div
        className="pointer-events-none flex h-full items-center gap-2 rounded-lg border px-2.5 text-xs transition-shadow group-hover:shadow-sm group-focus-within:ring-2 group-focus-within:ring-sky-500/40"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </span>
        <span className="font-semibold">
          {value ? dayjs(value).format("DD MMM YYYY") : "---"}
        </span>
        <CalendarDays
          className="ml-auto h-3.5 w-3.5"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      {/* Asal native input (invisible, poore box ke upar) */}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={openPicker}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ colorScheme: isDark ? "dark" : "light" }}
      />
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  className?: string;
  section?: string;
  schoolId: string;
  onChanged: () => void; // reverse ke baad invoice table refresh
}

export default function RecentPaymentsModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  className,
  section,
  schoolId,
  onChanged,
}: Props) {
  const isDark = useIsDark();

  // Range har roz khud calculate — saal khud barhte rahenge, code change ki zaroorat nahi
  const today = dayjs().format("YYYY-MM-DD");
  const minDate = dayjs().subtract(10, "year").startOf("year").format("YYYY-MM-DD");

  // Default: pichle 5 months
  const [fromDate, setFromDate] = useState(
    dayjs().subtract(5, "month").format("YYYY-MM-DD"),
  );
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(() => {
    if (!studentId || !fromDate || !toDate) return;

    // From, To se baad ho to khud ulat do (YYYY-MM-DD strings seedha compare hoti hain)
    const start = fromDate > toDate ? toDate : fromDate;
    const end = fromDate > toDate ? fromDate : toDate;

    setLoading(true);
    fetch(
      `/api/Fee_Management/recent-payments?studentId=${studentId}&schoolId=${schoolId}` +
        `&from=${start}&to=${end}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data?.payments) ? data.payments : []);
      })
      .catch(() => notify.error("Failed to load payments"))
      .finally(() => setLoading(false));
  }, [studentId, schoolId, fromDate, toDate]);

  // Modal khulne ya date badalne par khud reload
  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleReverse = async () => {
    if (!confirm) return;
    try {
      const res = await fetch("/api/Fee_Management/recent-payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: confirm.invoiceId,
          paymentId: confirm.paymentId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(
          `Payment ${data.paymentNo || ""} reversed — invoice is now ${data.invoiceStatus}`,
        );
        setConfirm(null);
        load();
        onChanged();
      } else {
        notify.error(data.message || "Failed to reverse payment");
      }
    } catch {
      notify.error("Something went wrong");
    }
  };

  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const classText = className
    ? `${className}${section ? ` (${section})` : ""}`
    : "";

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
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
            py: 1.5,
            px: 2,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
              <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-bold text-foreground text-sm">Recent Payments</p>
          </div>
          <IconButton
            onClick={onClose}
            size="small"
            tabIndex={-1}
            sx={{
              color: "var(--muted-foreground)",
              "&:hover": { backgroundColor: "var(--muted)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* Body */}
        <DialogContent
          dividers
          sx={{ backgroundColor: "var(--background)", p: 1.5 }}
        >
          {/* Student info + Date range */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            {/* Student */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {studentName}
              </h3>
              {classText && (
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                  {classText}
                </span>
              )}
            </div>

            {/* From — To */}
            <div className="flex items-center gap-2">
              <DateBox
                label="From"
                value={fromDate}
                min={minDate}
                max={today}
                onChange={setFromDate}
                isDark={isDark}
              />
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                —
              </span>
              <DateBox
                label="To"
                value={toDate}
                min={minDate}
                max={today}
                onChange={setToDate}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Table */}
          <div
            className="rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--muted)" }}>
                  {["#", "Receipt #", "Date", "Invoice", "Amount", "Method", "Received By", ""].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={`p-1.5 font-bold ${
                          h === "Amount" || h === "Method" ? "text-center" : "text-left"
                        }`}
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      No payments in this period.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={r.paymentId}
                      className="border-t"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor:
                          i % 2 === 0 ? "var(--card)" : "var(--muted)",
                      }}
                    >
                      <td className="p-1.5 text-foreground">{i + 1}</td>
                      <td className="p-1.5">
                        {r.paymentNo ? (
                          <span className="font-mono text-[11px] text-sky-700 dark:text-sky-300">
                            {r.paymentNo}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)" }}>---</span>
                        )}
                      </td>
                      <td className="p-1.5 text-foreground whitespace-nowrap">
                        {fmtDate(r.paidDate)}
                      </td>
                      <td className="p-1.5">
                        <p className="text-foreground font-medium truncate max-w-[200px]">
                          {r.invoiceTitle}
                        </p>
                      </td>
                      <td className="p-1.5 text-center text-green-600 dark:text-green-400 font-bold">
                        {r.amount?.toLocaleString()}
                      </td>
                      <td className="p-1.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 capitalize">
                          {r.method}
                        </span>
                      </td>
                      <td
                        className="p-1.5"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {r.receivedBy || "---"}
                      </td>
                      <td className="p-1.5 text-center">
                        <IconButton
                          size="small"
                          title="Reverse this payment"
                          onClick={() => setConfirm(r)}
                          sx={{
                            color: "#ef4444",
                            "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 dark:text-red-500" />
                        </IconButton>
                      </td>
                    </tr>
                  ))
                )}

                {/* Total */}
                {rows.length > 0 && (
                  <tr
                    className="border-t font-bold"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--muted)",
                    }}
                  >
                    <td
                      colSpan={4}
                      className="p-1.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Total ({rows.length} payment{rows.length > 1 ? "s" : ""})
                    </td>
                    <td className="p-1.5 text-center text-green-600 dark:text-green-400">
                      {total.toLocaleString()}
                    </td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={handleReverse}
        itemName={
          confirm
            ? `payment ${confirm.paymentNo || ""} (Rs. ${confirm.amount?.toLocaleString()})`
            : "this payment"
        }
      />
    </>
  );
}