"use client";

import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { WidgetCard, EmptyNote } from "./ui";

const PK = "Asia/Karachi";

const ACTIONS: Record<string, { verb: string; dot: string }> = {
  login: { verb: "Logged in", dot: "bg-violet-500" },
  login_failed: { verb: "Failed login", dot: "bg-rose-600" },
  create: { verb: "Added", dot: "bg-emerald-500" },
  update: { verb: "Updated", dot: "bg-sky-500" },
  delete: { verb: "Deleted", dot: "bg-rose-500" },
  payment: { verb: "Received", dot: "bg-amber-500" },
  reverse: { verb: "Reversed", dot: "bg-orange-500" },
  print: { verb: "Printed", dot: "bg-violet-500" },
  export: { verb: "Exported", dot: "bg-violet-500" },
  view: { verb: "Viewed", dot: "bg-slate-400" },
};

// "20 Nov 2026 · 04:52 PM" (Pakistan time)
function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", { timeZone: PK, day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: PK, hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}

// "feeCategories" → "Fee Categories"
const moduleName = (m: string) =>
  String(m || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

// "Received Rs. 7,000 (Bank) — PID-0031 · Hostel Fee" → "Received Rs. 7,000 (Bank)"
const shortSummary = (s: string) =>
  String(s || "")
    .split(/\s+[—·]\s+/)[0]
    ?.trim() || "";

// One readable line per activity
function titleOf(a: any) {
  const act = ACTIONS[a.action];
  const of = a.entityLabel ? ` of ${a.entityLabel}` : "";

  switch (a.action) {
    case "login":
    case "login_failed":
      return act.verb;
    case "payment":
      // "Received Rs. 7,000 (Bank) from Muhammad Khan (GR 157)"
      return `${shortSummary(a.summary) || "Received payment"}${a.entityLabel ? ` from ${a.entityLabel}` : ""}`;
    case "reverse":
      // "Reversed Rs. 7,000 (Bank) of Muhammad Khan (GR 157)"
      return `${shortSummary(a.summary) || "Reversed payment"}${of}`;
    case "print":
    case "export":
      // Bulk vouchers have no single record → "Generated 28 fee voucher(s)"
      return a.module === "vouchers"
        ? shortSummary(a.summary) || "Printed vouchers"
        : `${shortSummary(a.summary) || act.verb}${of}`;
    default:
      // "Updated Invoices of Muhammad Khan (GR 157)"
      return `${act?.verb || a.action} ${moduleName(a.module)}${of}`;
  }
}

export default function MyActivity({ data, className = "" }: { data: any; className?: string }) {
  const recent: any[] = data?.recent || [];

  return (
    <WidgetCard
      title="My Activity"
      icon={History}
      accent="amber"
      className={className}
      action={
        <Link
          href="/activity-logs?mine=1"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {recent.length === 0 ? (
        <EmptyNote>Your recent work will show here.</EmptyNote>
      ) : (
        <ul className="space-y-2">
          {recent.map((a) => {
            const dot = ACTIONS[a.action]?.dot || "bg-slate-400";
            const title = titleOf(a);
            return (
              <li key={a._id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-medium ${
                      a.action === "login_failed" ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                    }`}
                    title={title}
                  >
                    {title}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{when(a.createdAt)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}