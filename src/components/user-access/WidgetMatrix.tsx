"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WIDGETS, WIDGET_GROUPS, type Permissions } from "@/lib/permissions";
import { TriCheckbox, clone, muted, border } from "./ui";

type Row = { key: string; label: string; group: string; description: string };
const ROWS = WIDGETS as unknown as Row[];

// Dashboard widgets table: one tick per widget (show / hide)
export default function WidgetMatrix({
  value,
  onChange,
  readOnly,
  query = "",
}: {
  value: Permissions;
  onChange?: (p: Permissions) => void;
  readOnly?: boolean;
  query?: string;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const set = (fn: (w: Record<string, boolean>) => void) => {
    if (readOnly || !onChange) return;
    const next = clone(value);
    const w = { ...(next.widgets || {}) } as Record<string, boolean>;
    fn(w);
    next.widgets = w as Permissions["widgets"];
    onChange(next);
  };

  // Only "true" is stored (so ticking and unticking leaves no trace)
  const setOne = (w: Record<string, boolean>, key: string, on: boolean) => {
    if (on) w[key] = true;
    else delete w[key];
  };

  const toggle = (key: string) => set((w) => setOne(w, key, !w[key]));

  const toggleGroup = (rows: Row[]) =>
    set((w) => {
      const allOn = rows.every((r) => w[r.key]);
      rows.forEach((r) => setOne(w, r.key, !allOn));
    });

  const isOn = (key: string) => !!(value.widgets as any)?.[key];

  const q = query.trim().toLowerCase();
  const groups = WIDGET_GROUPS.map((g) => {
    const all = ROWS.filter((r) => r.group === g.key);
    const rows = q
      ? all.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q),
        )
      : all;
    return { key: g.key as string, label: g.label as string, rows };
  }).filter((g) => g.rows.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border overflow-hidden" style={border}>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--muted)" }}>
            <tr>
              <th className="px-3 py-2 text-left font-bold" style={muted}>Widget</th>
              <th className="hidden md:table-cell px-3 py-2 text-left font-bold" style={muted}>
                Shows
              </th>
              <th className="px-3 py-2 text-center font-bold w-24" style={muted}>Show on Dashboard</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center" style={muted}>
                  No widget matches “{query}”.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const open = q ? true : !closed[g.key];
                const ticked = g.rows.filter((r) => isOn(r.key)).length;
                const allOn = ticked === g.rows.length;

                return (
                  <Fragment key={g.key}>
                    {/* Group heading */}
                    <tr className="border-t" style={{ ...border, backgroundColor: "var(--muted)" }}>
                      <td colSpan={2} className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 cursor-pointer"
                        >
                          {open ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          {g.label}
                          <span
                            className="rounded-full px-1.5 text-[10px] font-bold normal-case tracking-normal"
                            style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
                          >
                            {ticked}/{g.rows.length}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {!readOnly && (
                          <TriCheckbox
                            checked={allOn}
                            indeterminate={!allOn && ticked > 0}
                            onChange={() => toggleGroup(g.rows)}
                            title={`${g.label}: all`}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Rows */}
                    {open &&
                      g.rows.map((r) => (
                        <tr
                          key={r.key}
                          className="border-t hover:bg-[color:var(--muted)]/50"
                          style={border}
                        >
                          <td className="pl-7 pr-3 py-1.5 font-medium text-foreground">{r.label}</td>
                          <td className="hidden md:table-cell px-3 py-1.5" style={muted}>
                            {r.description}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <TriCheckbox
                              checked={isOn(r.key)}
                              disabled={readOnly}
                              onChange={() => toggle(r.key)}
                              title={r.label}
                            />
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}