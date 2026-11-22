"use client";

import { LayoutGrid, LayoutDashboard } from "lucide-react";
import { MODULES, WIDGETS, type Permissions } from "@/lib/permissions";
import PermissionMatrix from "./PermissionMatrix";
import WidgetMatrix from "./WidgetMatrix";
import { card } from "./ui";

export type PanelView = "pages" | "widgets";

// [ Pages | Dashboard Widgets ] buttons — placed in the filter / header line
export function PanelTabs({
  value,
  view,
  onView,
}: {
  value: Permissions;
  view: PanelView;
  onView: (v: PanelView) => void;
}) {
  const pagesOn = MODULES.filter((m) =>
    (m.actions as readonly string[]).some((a) => (value.modules as any)?.[m.key]?.[a]),
  ).length;
  const widgetsOn = WIDGETS.filter((w) => (value.widgets as any)?.[w.key]).length;

  const tabs = [
    { key: "pages", label: "Pages", icon: LayoutGrid, count: `${pagesOn}/${MODULES.length}` },
    {
      key: "widgets",
      label: "Dashboard Widgets",
      icon: LayoutDashboard,
      count: `${widgetsOn}/${WIDGETS.length}`,
    },
  ] as const;

  return (
    <div className="inline-flex h-9 shrink-0 items-center rounded-lg border p-0.5" style={card}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = view === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onView(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              on ? "bg-sky-600 text-white" : "text-foreground hover:bg-[color:var(--muted)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : ""}`}
              style={on ? undefined : { backgroundColor: "var(--muted)" }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// The table for the chosen view (fills the rest, scrolls inside)
export default function PermissionsPanel({
  value,
  onChange,
  readOnly,
  query = "",
  view,
}: {
  value: Permissions;
  onChange?: (p: Permissions) => void;
  readOnly?: boolean;
  query?: string;
  view: PanelView;
}) {
  return (
    <div className="min-h-[300px] flex-1 lg:min-h-0">
      {view === "pages" ? (
        <PermissionMatrix value={value} onChange={onChange} readOnly={readOnly} query={query} />
      ) : (
        <WidgetMatrix value={value} onChange={onChange} readOnly={readOnly} query={query} />
      )}
    </div>
  );
}