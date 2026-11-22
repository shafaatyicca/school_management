"use client";

import type { LucideIcon } from "lucide-react";

const ACCENTS = {
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
} as const;
export type Accent = keyof typeof ACCENTS;

// Frame used by every widget
export function WidgetCard({
  title,
  icon: Icon,
  accent = "sky",
  action,
  className = "",
  bodyClass = "p-4",
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent?: Accent;
  action?: React.ReactNode;
  className?: string;
  bodyClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border bg-card shadow-sm ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      <header
        className="flex items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;
}

// ── Helpers (Pakistan time) ──────────────────────────────────

export const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

export const pkTime = (d?: string | Date | null) =>
  d
    ? new Date(d).toLocaleTimeString("en-PK", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

export const pkDate = (d?: string | Date | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "short",
      })
    : "";

export function timeAgo(d?: string | Date | null) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export const initials = (name: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");