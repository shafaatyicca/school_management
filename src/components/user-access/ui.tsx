"use client";

import { useEffect, useRef } from "react";
import { Search, Save, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMPTY_PERMISSIONS, type Permissions } from "@/lib/permissions";

// ── Shared styles ────────────────────────────────────────────

export const muted = { color: "var(--muted-foreground)" };
export const border = { borderColor: "var(--border)" };
export const card = { borderColor: "var(--border)", backgroundColor: "var(--card)" };

export const GRID = "grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3 lg:flex-1 lg:min-h-0";
export const PANEL = "flex min-h-0 flex-col rounded-xl border overflow-hidden lg:h-full";
export const HEADER_BAR =
  "shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b";
export const BODY = "flex flex-1 min-h-0 flex-col gap-2 p-3";
export const CONTROL = "flex h-9 items-center justify-between gap-2 rounded-lg border px-3 text-xs";

export const listRow = (on: boolean) =>
  `relative flex w-full items-center gap-3 px-3 py-2 text-left border-b cursor-pointer transition-colors ${
    on ? "bg-sky-500/10" : "hover:bg-[color:var(--muted)]"
  }`;

export const indicator = (on: boolean) =>
  `absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sky-500 transition-opacity ${
    on ? "opacity-100" : "opacity-0"
  }`;

// ── Helpers ──────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export / Print",
};
export const ALL_ACTIONS = ["view", "create", "edit", "delete", "export"];

// Deep copy (always has modules + widgets)
export const clone = (p: any): Permissions => {
  const c = JSON.parse(JSON.stringify(p || EMPTY_PERMISSIONS));
  if (!c.modules) c.modules = {};
  if (!c.widgets) c.widgets = {};
  if (!c.special) c.special = {};
  return c;
};

export const pkTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Never";

// ── Small UI pieces ──────────────────────────────────────────

export function PermissionSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-9 w-full items-center gap-2 rounded-lg border px-2.5" style={card}>
      <Search className="w-3.5 h-3.5 shrink-0" style={muted} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search access…"
        className="flex-1 min-w-0 bg-transparent text-xs text-foreground outline-none"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="cursor-pointer" aria-label="Clear">
          <X className="w-3.5 h-3.5" style={muted} />
        </button>
      )}
    </div>
  );
}

// Toggle switch (Tailwind only)
export function Switch({
  on,
  onChange,
  color = "bg-sky-600",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
        on ? color : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

// Checkbox that can also show "some ticked" (–)
export function TriCheckbox({
  checked,
  indeterminate = false,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      title={title}
      className="h-4 w-4 accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
    />
  );
}

// Save + Discard for the editor header
export function SaveActions({
  dirty,
  saving,
  onDiscard,
  onSave,
  saveLabel = "Save",
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {dirty && (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Unsaved
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={onDiscard}
        disabled={!dirty || saving}
        className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
        title="Discard changes"
      >
        <RotateCcw className="w-3.5 h-3.5 mr-1" />
        Discard
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || !dirty}
        className="h-8 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 cursor-pointer"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5 mr-1" />
        )}
        {saving ? "Saving..." : saveLabel}
      </Button>
    </div>
  );
}