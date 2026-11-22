"use client";

import Link from "next/link";
import { KeyRound, ArrowRight } from "lucide-react";
import { WidgetCard, EmptyNote, timeAgo, initials } from "./ui";

const MAX_USERS = 6;

// "2026-11-19" → "W"
const dayLetter = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });

// "2026-11-19" → "Wed 19 Nov"
const dayFull = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// Darker = more logins that day
const cellColor = (n: number) =>
  n === 0
    ? "bg-slate-200 dark:bg-slate-700"
    : n === 1
      ? "bg-sky-300 dark:bg-sky-800"
      : n <= 3
        ? "bg-sky-500"
        : "bg-sky-700 dark:bg-sky-400";

const roleText = (r: string) => String(r || "").replace(/_/g, " ");

export default function LoginActivity({ data }: { data: any }) {
  const days: any[] = data?.days || [];
  const users: any[] = data?.users || [];
  const shown = users.slice(0, MAX_USERS);
  const hidden = users.length - shown.length;

  const stats = [
    { label: "Logins", value: data?.totalLogins ?? 0, cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { label: "Users", value: data?.activeUsers ?? 0, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { label: "No login", value: data?.inactiveUsers ?? 0, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  ];

  // Same column widths for the header and every user row
  const GRID = "grid grid-cols-[1fr_auto_2rem] items-center gap-2";

  return (
    <WidgetCard
      title="Login Activity · this week"
      icon={KeyRound}
      accent="slate"
      action={
        data?.failedToday > 0 ? (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
            {data.failedToday} failed today
          </span>
        ) : null
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-lg px-2 py-1.5 text-center ${s.cls}`}>
            <p className="text-lg font-bold leading-tight">{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {users.length === 0 ? (
        <EmptyNote>No logins in the last 7 days.</EmptyNote>
      ) : (
        <div className="mt-3">
          {/* Day header: letter + total logins that day */}
          <div className={`${GRID} border-b pb-1.5`} style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User</span>
            <span className="flex gap-1">
              {days.map((d) => (
                <span key={d.date} className="flex w-3.5 flex-col items-center leading-none" title={dayFull(d.date)}>
                  <span className="text-[10px] text-muted-foreground">{dayLetter(d.date)}</span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">{d.future ? "–" : d.count}</span>
                </span>
              ))}
            </span>
            <span className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          </div>

          {/* One row per user */}
          <ul>
            {shown.map((u) => (
              <li key={u.userId} className={`${GRID} border-b py-1.5 last:border-b-0`} style={{ borderColor: "var(--border)" }}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[9px] font-bold text-white">
                    {initials(u.userName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">{u.userName}</span>
                    <span className="block truncate text-[10px] capitalize text-muted-foreground">
                      {roleText(u.userRole)}
                      {u.failed > 0 && <span className="normal-case text-rose-600"> · {u.failed} failed</span>}
                      {u.lastLogin && <span className="normal-case text-emerald-600 dark:text-emerald-400"> · Last Login {timeAgo(u.lastLogin)}</span>}
                    </span>
                  </span>
                </span>

                <span className="flex gap-1">
                  {u.days.map((n: number, i: number) =>
                    days[i]?.future ? (
                      // Day not reached yet
                      <span
                        key={i}
                        className="h-3.5 w-3.5 rounded-sm border border-dashed border-slate-300 dark:border-slate-600"
                        title={`${dayFull(days[i].date)}: not yet`}
                      />
                    ) : (
                      <span
                        key={i}
                        className={`h-3.5 w-3.5 rounded-sm ${cellColor(n)}`}
                        title={`${days[i] ? dayFull(days[i].date) : ""}: ${n} login(s)`}
                      />
                    ),
                  )}
                </span>

                <span className="text-right text-xs font-bold text-foreground">{u.total}</span>
              </li>
            ))}
          </ul>

          {hidden > 0 && (
            <Link
              href="/activity-logs"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              +{hidden} more · View all in Activity Logs <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </WidgetCard>
  );
}