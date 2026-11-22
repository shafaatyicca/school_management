"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { WidgetCard, EmptyNote, pkDate } from "./ui";

export default function Admissions({ data }: { data: any }) {
  const newest: any[] = data?.newest || [];
  const left: any[] = data?.left || [];

  // Which list is open (New by default)
  const [view, setView] = useState<"new" | "left">("new");

  const row = (s: any, date: string, tone: string) => (
        <li key={s._id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <span className="min-w-0 truncate">
        <span className="font-medium text-foreground">{s.fullName}</span>
        <span className="text-[10px] text-muted-foreground">
          {" "}· GR {s.grNumber} · {s.className || "---"}
          {s.section ? ` (${s.section})` : ""}
        </span>
      </span>
      <span className={`shrink-0 text-[10px] font-semibold ${tone}`}>{date}</span>
    </li>
  );

  const list = view === "new" ? newest : left;

  return (
    <WidgetCard title="Admissions · this month" icon={UserPlus} accent="violet">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setView("new")}
          aria-pressed={view === "new"}
          className={`rounded-lg border-2 bg-emerald-500/10 p-3 text-center transition-all cursor-pointer ${
            view === "new"
              ? "border-emerald-500 shadow-sm"
              : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data?.newCount || 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Admissions</p>
        </button>

        <button
          type="button"
          onClick={() => setView("left")}
          aria-pressed={view === "left"}
          className={`rounded-lg border-2 bg-rose-500/10 p-3 text-center transition-all cursor-pointer ${
            view === "left"
              ? "border-rose-500 shadow-sm"
              : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{data?.leftCount || 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Withdrawals</p>
        </button>
      </div>

      <div className="mt-3">
          {list.length === 0 ? (
          <EmptyNote>
            {view === "new" ? "No new admissions this month." : "No students left this month."}
          </EmptyNote>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {view === "new"
              ? newest.map((s) => row(s, pkDate(s.enrollmentDate), "text-emerald-600"))
              : left.map((s) => row(s, pkDate(s.inactiveDate), "text-rose-600"))}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}