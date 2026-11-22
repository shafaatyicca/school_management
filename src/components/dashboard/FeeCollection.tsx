"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { WidgetCard, money } from "./ui";

const METHODS = [
  { key: "cash", label: "Cash", bar: "bg-emerald-500" },
  { key: "bank", label: "Bank", bar: "bg-sky-500" },
  { key: "online", label: "Online", bar: "bg-violet-500" },
];

export default function FeeCollection({ data }: { data: any }) {
  // Which period the bars show (Today by default)
  const [view, setView] = useState<"today" | "month">("today");

  const total = view === "today" ? data?.todayAmount || 0 : data?.monthAmount || 0;
  const byMethod = (view === "today" ? data?.byMethod : data?.monthByMethod) || {};

  return (
    <WidgetCard title="Fee Collection" icon={Wallet} accent="emerald">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setView("today")}
          aria-pressed={view === "today"}
          className={`rounded-lg border-2 bg-emerald-500/10 p-3 text-left transition-all cursor-pointer ${
            view === "today" ? "border-emerald-500 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Today
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{money(data?.todayAmount || 0)}</p>
          <p className="text-[11px] text-muted-foreground">{data?.todayCount || 0} payment(s)</p>
        </button>

        <button
          type="button"
          onClick={() => setView("month")}
          aria-pressed={view === "month"}
          className={`rounded-lg border-2 bg-sky-500/10 p-3 text-left transition-all cursor-pointer ${
            view === "month" ? "border-sky-500 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            This Month
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{money(data?.monthAmount || 0)}</p>
          <p className="text-[11px] text-muted-foreground">{data?.monthCount || 0} payment(s)</p>
        </button>
      </div>

      {/* Cash / Bank / Online for the selected period */}
      <div className="mt-4 space-y-4">
        {METHODS.map((m) => {
          const amount = byMethod[m.key] || 0;
          const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
          return (
            <div key={m.key}>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold text-foreground">{money(amount)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}