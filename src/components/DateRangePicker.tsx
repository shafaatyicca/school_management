"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  from: string; // YYYY-MM-DD ("" = not picked)
  to: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-11-25" ↔ local Date (no time-zone shift)
const toDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nice = (d?: Date) =>
  d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const monthName = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export default function DateRangePicker({ from, to, onChange }: Props) {
  const fromDate = toDate(from);
  const toDateV = toDate(to);
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Opens by itself when no start date is picked yet
  const [open, setOpen] = useState(!fromDate);
  // Draft while picking: first click = start, second click = end
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({ from: fromDate, to: toDateV });
  // First of the two months shown (right month = current month by default)
  const [month, setMonth] = useState<Date>(() =>
    fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), 1) : addMonths(thisMonth, -1),
  );
  const boxRef = useRef<HTMLDivElement>(null);

  // Reopen → start again from the saved range
  useEffect(() => {
    if (open) setDraft({ from: fromDate, to: toDateV });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (day: Date) => {
    // No start yet, a full range already picked, or a day before the start → new start
    if (!draft.from || draft.to || day < draft.from) {
      setDraft({ from: day, to: undefined });
      return;
    }
    // Second click → done
    setDraft({ from: draft.from, to: day });
    onChange(toYmd(draft.from), toYmd(day));
    setOpen(false);
  };

  const label = fromDate && toDateV ? `${nice(fromDate)} – ${nice(toDateV)}` : "Select dates";
  const nextDisabled = addMonths(month, 1) >= thisMonth; // right month is already this month

  const arrow =
    "flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 cursor-pointer hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900";

  return (
    <div ref={boxRef} className="relative inline-block">
      {/* Box with both dates */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-8 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer transition-colors dark:bg-slate-900 dark:text-slate-200 ${
          open
            ? "border-sky-500 ring-2 ring-sky-100 dark:border-sky-400 dark:ring-sky-500/20"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
        <span className={fromDate && toDateV ? "" : "text-slate-400 dark:text-slate-500"}>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Popup — centred under the box */}
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {/* Header: arrows + both month names */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
            <button type="button" className={arrow} onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="grid flex-1 grid-cols-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span>{monthName(month)}</span>
              <span>{monthName(addMonths(month, 1))}</span>
            </div>
            <button
              type="button"
              className={arrow}
              disabled={nextDisabled}
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Two calendars (small side padding) */}
          <div className="px-1.5 pt-1.5">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              month={month}
              onMonthChange={setMonth}
              hideNavigation
              showOutsideDays={false}
              disabled={{ after: today }}
              selected={draft.from ? { from: draft.from, to: draft.to } : undefined}
              onSelect={(_range, day) => pick(day)}
              components={{ MonthCaption: () => <></> }}
              classNames={{
                months: "flex gap-3",
                month: "",
                month_grid: "border-collapse",
                weekdays: "",
                weekday: "h-6 w-7 text-[11px] font-medium text-slate-400 dark:text-slate-500",
                week: "",
                day: "p-0 text-center",
                day_button:
                  "h-7 w-7 rounded-md text-xs text-slate-700 cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed dark:text-slate-200 dark:hover:bg-slate-800",
                today: "font-bold text-sky-600 dark:text-sky-400",
                range_middle:
                  "bg-sky-100 dark:bg-sky-500/20 [&>button]:rounded-none [&>button]:text-sky-700 dark:[&>button]:text-sky-300",
                range_start:
                  "rounded-l-md bg-sky-600 dark:bg-sky-500 [&>button]:text-white [&>button]:hover:bg-sky-600 dark:[&>button]:hover:bg-sky-500",
                range_end:
                  "rounded-r-md bg-sky-600 dark:bg-sky-500 [&>button]:text-white [&>button]:hover:bg-sky-600 dark:[&>button]:hover:bg-sky-500",
                disabled: "opacity-30",
                hidden: "invisible",
              }}
            />
          </div>

          <p className="pb-2 pt-1 text-center text-[11px] text-orange-400 dark:text-slate-500">
            {draft.from && !draft.to ? `From ${nice(draft.from)} — now pick the end date` : "Click start date, then end date"}
          </p>
        </div>
      )}
    </div>
  );
}