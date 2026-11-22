"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MODULES, MODULE_GROUPS, type Permissions } from "@/lib/permissions";
import { ACTION_LABELS, ALL_ACTIONS, TriCheckbox, clone, muted, border } from "./ui";

type Row = { key: string; label: string; group: string; actions: readonly string[] };
const ROWS = MODULES as unknown as Row[];

// Pages table, grouped (Students, Fees, …). Groups open / close on click.
export default function PermissionMatrix({
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

  const set = (fn: (p: any) => void) => {
    if (readOnly || !onChange) return;
    const next = clone(value);
    fn(next);
    onChange(next);
  };

  // One action
  const toggle = (m: Row, action: string) =>
    set((p) => {
      const row = { ...(p.modules[m.key] || {}) };
      row[action] = !row[action];
      // Other actions need View (when this row has View)
      if (m.actions.includes("view")) {
        if (action !== "view" && row[action]) row.view = true;
        if (action === "view" && !row.view) m.actions.forEach((a) => (row[a] = false));
      }
      p.modules[m.key] = row;
    });

  // Whole row
  const toggleRow = (m: Row) =>
    set((p) => {
      const row = p.modules[m.key] || {};
      const allOn = m.actions.every((a) => row[a]);
      p.modules[m.key] = Object.fromEntries(m.actions.map((a) => [a, !allOn]));
    });

  // Whole group (the rows currently shown)
  const toggleGroup = (rows: Row[]) =>
    set((p) => {
      const allOn = rows.every((m) => m.actions.every((a) => p.modules[m.key]?.[a]));
      rows.forEach((m) => {
        p.modules[m.key] = Object.fromEntries(m.actions.map((a) => [a, !allOn]));
      });
    });

  const isOn = (key: string, a: string) => !!(value.modules as any)?.[key]?.[a];

  const q = query.trim().toLowerCase();
  const groups = MODULE_GROUPS.map((g) => {
    const all = ROWS.filter((m) => m.group === g.key);
    const rows = q
      ? all.filter((m) => m.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q))
      : all;
    return { key: g.key as string, label: g.label as string, rows };
  }).filter((g) => g.rows.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border overflow-hidden" style={border}>
      {/* Only this area scrolls; the head row stays on top */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--muted)" }}>
            <tr>
              <th className="px-3 py-2 text-left font-bold" style={muted}>Page</th>
              {ALL_ACTIONS.map((a) => (
                <th key={a} className="px-2 py-2 text-center font-bold whitespace-nowrap" style={muted}>
                  {ACTION_LABELS[a]}
                </th>
              ))}
              {!readOnly && <th className="px-2 py-2 text-center font-bold" style={muted}>All</th>}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={ALL_ACTIONS.length + 2} className="p-6 text-center" style={muted}>
                  No access matches “{query}”.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const open = q ? true : !closed[g.key];
                const ticked = g.rows.filter((m) => m.actions.some((a) => isOn(m.key, a))).length;
                const allOn = g.rows.every((m) => m.actions.every((a) => isOn(m.key, a)));
                const someOn = g.rows.some((m) => m.actions.some((a) => isOn(m.key, a)));

                return (
                  <Fragment key={g.key}>
                    {/* Group heading */}
                    <tr className="border-t" style={{ ...border, backgroundColor: "var(--muted)" }}>
                      <td colSpan={ALL_ACTIONS.length + 1} className="px-2 py-1.5">
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
                      {!readOnly && (
                        <td className="px-2 py-1.5 text-center">
                          <TriCheckbox
                            checked={allOn}
                            indeterminate={!allOn && someOn}
                            onChange={() => toggleGroup(g.rows)}
                            title={`${g.label}: all`}
                          />
                        </td>
                      )}
                    </tr>

                    {/* Rows */}
                    {open &&
                      g.rows.map((m) => {
                        const rowAll = m.actions.every((a) => isOn(m.key, a));
                        return (
                          <tr
                            key={m.key}
                            className="border-t hover:bg-[color:var(--muted)]/50"
                            style={border}
                          >
                            <td className="pl-7 pr-3 py-1.5 font-medium text-foreground">{m.label}</td>
                            {ALL_ACTIONS.map((a) => (
                              <td key={a} className="px-2 py-1.5 text-center">
                                {m.actions.includes(a) ? (
                                  <TriCheckbox
                                    checked={isOn(m.key, a)}
                                    disabled={readOnly}
                                    onChange={() => toggle(m, a)}
                                    title={`${m.label}: ${ACTION_LABELS[a]}`}
                                  />
                                ) : (
                                  <span style={muted}>—</span>
                                )}
                              </td>
                            ))}
                            {!readOnly && (
                              <td className="px-2 py-1.5 text-center">
                                <TriCheckbox
                                  checked={rowAll}
                                  onChange={() => toggleRow(m)}
                                  title={`${m.label}: all`}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
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