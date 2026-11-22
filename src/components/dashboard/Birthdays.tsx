"use client";

import { useState } from "react";
import { Cake, Gift } from "lucide-react";
import { WidgetCard, EmptyNote, initials } from "./ui";

const MAX_ROWS = 5;

const whenLabel = (days: number) =>
  days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`;

export default function Birthdays({ data }: { data: any }) {
  const [tab, setTab] = useState<"students" | "staff">("students");
  const all: any[] = (tab === "students" ? data?.students : data?.staff) || [];
  const list = all.slice(0, MAX_ROWS); // nearest birthdays first (already sorted by the API)

  const tabs = [
    { key: "students", label: "Students", count: data?.students?.length || 0 },
    { key: "staff", label: "Staff", count: data?.staff?.length || 0 },
  ] as const;

  return (
    <WidgetCard
      title="Birthdays · next 7 days"
      icon={Cake}
      accent="rose"
      bodyClass="p-0"
      action={
        <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: "var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                tab === t.key
                  ? "bg-sky-600 text-white"
                  : "text-muted-foreground hover:bg-[color:var(--muted)] hover:text-foreground"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      }
    >
      {list.length === 0 ? (
        <EmptyNote>No birthdays this week.</EmptyNote>
      ) : (
        <ul>
          {list.map((p) => (
            <li
              key={p._id}
              className="flex items-center gap-3 border-t px-4 py-2 first:border-t-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-[10px] font-bold text-white">
                {initials(p.fullName)}
                {p.image && (
                  <img
                    src={p.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">{p.fullName}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {tab === "students"
                    ? `GR ${p.grNumber} · ${p.className || "---"}${p.section ? ` (${p.section})` : ""}`
                    : `ID ${p.emp_id ?? "---"} · ${p.designation || "---"}`}
                </span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  p.daysLeft === 0
                    ? "bg-rose-500 text-white"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                }`}
              >
                {p.daysLeft === 0 && <Gift className="h-3 w-3" />}
                {whenLabel(p.daysLeft)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}