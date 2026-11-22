"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  Printer,
  Search,
  Loader2,
  Wallet,
  FileText,
  AlertCircle,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { toYMD, pkToday } from "@/lib/pkTime";

type Mode = "today" | "month" | "year" | "custom";
type SortKey = "date" | "paymentNo" | "school" | "invoiceNumber" | "billingMonth" | "note" | "amount";
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
const rs = (n: any) => `Rs ${Number(n || 0).toLocaleString("en-US")}`;
const pkDate = (d: any) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
const esc = (s: any) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

// "November 2026" → sortable number (falls back to text)
const monthValue = (s: any) => {
  const t = Date.parse(`1 ${String(s || "")}`);
  return isNaN(t) ? null : t;
};

// Compare two rows by the selected column
const compareBy = (key: SortKey, a: any, b: any) => {
  if (key === "date") return new Date(a.date).getTime() - new Date(b.date).getTime();
  if (key === "amount") return Number(a.amount || 0) - Number(b.amount || 0);
  if (key === "billingMonth") {
    const x = monthValue(a.billingMonth);
    const y = monthValue(b.billingMonth);
    if (x !== null && y !== null) return x - y;
  }
  return String(a[key] || "").localeCompare(String(b[key] || ""), "en", {
    numeric: true,
    sensitivity: "base",
  });
};

export default function CollectionsPage() {
  const t = pkToday();
  const [mode, setMode] = useState<Mode>("month");
  const [ym, setYm] = useState({ y: t.y, m: t.m });
  const [year, setYear] = useState(t.y);
  const [custom, setCustom] = useState({ from: toYMD(), to: toYMD() });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  // Selected period → from / to (Pakistan days)
  const range = useMemo(() => {
    if (mode === "today") {
      const d = toYMD();
      return { from: d, to: d, label: pkDate(new Date()) };
    }
    if (mode === "month") {
      return {
        from: `${ym.y}-${pad(ym.m)}-01`,
        to: `${ym.y}-${pad(ym.m)}-${pad(lastDay(ym.y, ym.m))}`,
        label: `${MONTHS_FULL[ym.m - 1]} ${ym.y}`,
      };
    }
    if (mode === "year")
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        label: String(year),
      };
    return {
      from: custom.from,
      to: custom.to,
      label: `${custom.from} → ${custom.to}`,
    };
  }, [mode, ym, year, custom]);

  const stripYear =
    mode === "year"
      ? year
      : mode === "month"
        ? ym.y
        : Number(range.from.slice(0, 4)) || t.y;

  const load = useCallback(async () => {
    if (!range.from || !range.to) return;
    if (range.from > range.to) {
      notify.error("Invalid range", "'From' date must be before 'To' date");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/collections?from=${range.from}&to=${range.to}&year=${stripYear}`,
      );
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error);
      setData(d);
    } catch (e: any) {
      notify.error("Error!", e?.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, stripYear]);

  useEffect(() => {
    load();
  }, [load]);

  // ◀ ▶ (month / year modes)
  const step = (dir: -1 | 1) => {
    if (mode === "month") {
      setYm((p) => {
        let m = p.m + dir;
        let y = p.y;
        if (m < 1) {
          m = 12;
          y--;
        }
        if (m > 12) {
          m = 1;
          y++;
        }
        return { y, m };
      });
    } else if (mode === "year") {
      setYear((y) => y + dir);
    }
  };

  // Click: asc → desc → original order
  const toggleSort = (key: SortKey) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.payments || []).filter(
      (p: any) =>
        (!schoolFilter || p.schoolId === schoolFilter) &&
        (!q ||
          [p.school, p.invoiceNumber, p.paymentNo, p.billingMonth, p.note].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
          )),
    );
    if (!sort) return list;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a: any, b: any) => sign * compareBy(sort.key, a, b));
  }, [data, search, schoolFilter, sort]);

  const rowsTotal = rows.reduce((sum: number, p: any) => sum + p.amount, 0);
  const tot = data?.totals || {};
  const monthly: number[] = data?.monthly || [];
  const maxMonth = Math.max(1, ...monthly);

  const exportExcel = () => {
    if (!rows.length) {
      notify.error("Nothing to export", "No payments in this period");
      return;
    }
    const sheet: any[] = rows.map((p: any, i: number) => ({
      "#": i + 1,
      Received_Date: pkDate(p.date),
      Payment_ID: p.paymentNo,
      School: p.school,
      Invoice: p.invoiceNumber,
      "For Month": p.billingMonth,
      Note: p.note,
      Amount: p.amount,
    }));
    sheet.push({
      "#": "",
      Received_Date: "",
      Payment_ID: "",
      School: "TOTAL",
      Invoice: "",
      "For Month": "",
      Note: "",
      Amount: rowsTotal,
    });
    const ws = XLSX.utils.json_to_sheet(sheet);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 12 },
      { wch: 34 },
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");
    XLSX.writeFile(wb, `collections-${range.from}-to-${range.to}.xlsx`);
  };

  const printList = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const body = rows
      .map(
        (p: any, i: number) =>
          `<tr><td>${i + 1}</td><td>${pkDate(p.date)}</td><td>${esc(p.paymentNo)}</td><td>${esc(p.school)}</td><td>${esc(p.invoiceNumber)}</td><td>${esc(p.billingMonth)}</td><td>${esc(p.note)}</td><td class="r">${p.amount.toLocaleString("en-US")}</td></tr>`,
      )
      .join("");
    w.document
      .write(`<html><head><title>Collections - ${esc(range.label)}</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:16px}h2{margin:0 0 4px}p{margin:0 0 12px;color:#555}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f1f5f9}.r{text-align:right}</style>
</head><body><h2>Collections — ${esc(range.label)}</h2><p>Collected: ${rs(rowsTotal)} · ${rows.length} payment(s)</p>
<table><thead><tr><th>#</th><th>Received Date</th><th>Payment ID</th><th>School</th><th>Invoice</th><th>For Month</th><th>Note</th><th class="r">Amount</th></tr></thead>
<tbody>${body}<tr><th colspan="7">Total</th><th class="r">${rowsTotal.toLocaleString("en-US")}</th></tr></tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const MODES: { key: Mode; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "custom", label: "Custom" },
  ];

  const kpi = (title: string, value: any, sub: any, Icon: any, cls: string) => (
    <div className={`h-full p-3 rounded-md border ${cls}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-80">
        <Icon size={14} /> {title}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] opacity-80">{sub}</div>
    </div>
  );

  // Sortable table heading
  const sortTh = (label: string, key: SortKey, right = false) => {
    const active = sort?.key === key;
    const Icon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={`px-3 py-2 font-semibold ${right ? "text-right" : "text-left"}`}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 cursor-pointer select-none hover:text-slate-800 ${
            right ? "flex-row-reverse" : ""
          } ${active ? "text-slate-800" : ""}`}
        >
          {label}
          <Icon size={12} className={active ? "text-indigo-500" : "text-slate-300"} />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Period + export */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-md border border-slate-100 shadow-sm">
        {(mode === "month" || mode === "year") && (
          <button
            onClick={() => step(-1)}
            className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700">
          <Calendar size={15} className="text-indigo-500" /> {range.label}
        </span>
        {(mode === "month" || mode === "year") && (
          <button
            onClick={() => step(1)}
            className="p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 h-9 text-xs font-semibold cursor-pointer ${
                mode === m.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) =>
                setCustom((c) => ({ ...c, from: e.target.value }))
              }
              className="h-9 rounded-md border border-slate-200 px-2"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-9 rounded-md border border-slate-200 px-2"
            />
          </div>
        )}

        <div className="flex gap-2 sm:ml-auto">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 rounded-md border border-emerald-200 px-3 h-9 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={printList}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 h-9 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        {kpi(
          "Collected",
          rs(tot.collected),
          `${tot.count ?? 0} payment(s)`,
          Wallet,
          "bg-emerald-50/60 border-emerald-200 text-emerald-700",
        )}
        {kpi(
          "Billed",
          rs(tot.billed),
          `${tot.invoices ?? 0} invoice(s) for these months`,
          FileText,
          "bg-white border-slate-200 text-slate-700",
        )}
        {kpi(
          "Still Pending",
          rs(tot.pending),
          `${tot.pendingSchools ?? 0} school(s) with dues`,
          AlertCircle,
          "bg-rose-50/60 border-rose-200 text-rose-700",
        )}
        <div className="h-full p-3 rounded-md border bg-indigo-50/60 border-indigo-200 text-indigo-700">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-80">
            <TrendingUp size={14} /> Recovery
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {tot.recovery ?? 0}%
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white">
            <div
              className="h-1.5 rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, tot.recovery || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 12-month strip */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold uppercase text-slate-700">
            {stripYear} by month{" "}
            <span className="font-normal normal-case text-slate-400">
              · click a month to open it
            </span>
          </h3>
          <span className="text-xs font-semibold text-emerald-600">
            Year total: {rs(monthly.reduce((a, b) => a + b, 0))}
          </span>
        </div>
        <div className="grid grid-cols-12 gap-1.5 items-end h-24">
          {monthly.map((v, i) => {
            const on = mode === "month" && ym.y === stripYear && ym.m === i + 1;
            return (
              <button
                key={i}
                onClick={() => {
                  setMode("month");
                  setYm({ y: stripYear, m: i + 1 });
                }}
                title={`${MONTHS_FULL[i]}: ${rs(v)}`}
                className="h-full flex flex-col justify-end cursor-pointer group"
              >
                <div
                  className={`w-full rounded-t ${on ? "bg-emerald-500" : "bg-emerald-200 group-hover:bg-emerald-300"}`}
                  style={{
                    height: `${Math.max(4, Math.round((v / maxMonth) * 100))}%`,
                  }}
                />
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-12 gap-1.5 mt-1 text-center text-[10px] text-slate-400">
          {MONTHS_SHORT.map((m, i) => (
            <span
              key={m}
              className={
                mode === "month" && ym.y === stripYear && ym.m === i + 1
                  ? "font-bold text-emerald-600"
                  : ""
              }
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school, invoice, payment ID, note..."
              className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 text-xs outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 text-xs cursor-pointer"
          >
            <option value="">All schools</option>
            {(data?.schools || []).map((s: any) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-10">#</th>
                {sortTh("Received Date", "date")}
                {sortTh("Payment ID", "paymentNo")}
                {sortTh("School", "school")}
                {sortTh("Invoice", "invoiceNumber")}
                {sortTh("For Month", "billingMonth")}
                {sortTh("Note", "note")}
                {sortTh("Amount", "amount", true)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Loader2 size={16} className="inline animate-spin mr-1" />{" "}
                    Loading payments…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No payments in {range.label}.
                  </td>
                </tr>
              ) : (
                rows.map((p: any, i: number) => (
                  <tr key={`${p.invoiceId}-${p.paymentNo || i}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {pkDate(p.date)}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">
                      {p.paymentNo || "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700 uppercase">
                      {p.school}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/superadmin/schools/${p.schoolId}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {p.invoiceNumber || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {p.billingMonth}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {p.note || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {p.amount.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={7} className="px-3 py-2 text-slate-700">
                    Total ({rows.length} payment{rows.length > 1 ? "s" : ""})
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700 whitespace-nowrap">
                    {rs(rowsTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}