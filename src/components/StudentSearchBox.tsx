"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, CornerDownLeft } from "lucide-react";

export type StudentOption = {
  _id: string;
  fullName: string;
  grNumber: number | string;
  className: string;
  section?: string;
  image?: string;
};

export default function StudentSearchBox({
  schoolId,
  loading = false,
  onSelect,
  onSearch,
  clearOnSelect = false,
  showSearchButton = true,
  variant = "header",
  placeholder = "Search Name or GR#...",
}: {
  schoolId?: string | null;
  loading?: boolean;
  onSelect: (student: StudentOption) => void;
  onSearch?: (query: string) => void;
  clearOnSelect?: boolean; // clear the box after picking (Fee Voucher page)
  showSearchButton?: boolean;
  variant?: "header" | "page";
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [active, setActive] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 256 });

  const boxRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);
  const justFocused = useRef(false);

  // Portal only in the browser (SSR safe)
  useEffect(() => setMounted(true), []);

  // Dropdown position right below the input
  const updatePosition = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  // Fetch students 300ms after typing stops
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (!q || !schoolId) {
      setOptions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setFetching(true);
      fetch(
        `/api/Fee_Management/student-search?q=${encodeURIComponent(q)}&schoolId=${schoolId}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setOptions(list);
          setOpen(true);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, schoolId]);

  // Close dropdown on outside click (portal list counts as inside)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boxRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const choose = (student: StudentOption) => {
    if (clearOnSelect) {
      setQuery("");
      inputRef.current?.focus();
    } else {
      skipNextFetch.current = true; // don't search again for the picked name
      setQuery(student.fullName);
    }
    setOptions([]);
    setOpen(false);
    setActive(-1);
    onSelect(student);
  };

  // Arrow keys / Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Enter / Search button
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && options[active]) return choose(options[active]);
    if (options.length === 1) return choose(options[0]);
    setOpen(false);
    if (query.trim() && onSearch) onSearch(query.trim());
  };

  // Highlight the typed part in the name
  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-100 font-semibold text-amber-800 dark:bg-amber-500/25 dark:text-amber-200">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  // Name initials (when no photo)
  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.max(pos.width, 300),
            }}
            className="z-[1400] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
          >
            {/* Header */}
            {options.length > 0 && (
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/70">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Students
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-px text-[10px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                  {options.length}
                </span>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto py-1">
              {fetching && options.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Searching...
                </div>
              ) : options.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  No student found
                </div>
              ) : (
                options.map((s, i) => {
                  const isActive = i === active;
                  const classText = s.className
                    ? `${s.className}${s.section ? ` (${s.section})` : ""}`
                    : "";
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(s)}
                      onMouseEnter={() => setActive(i)}
                      className={`relative flex w-full items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors duration-150 ${
                        isActive
                          ? "bg-sky-50 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Active line */}
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sky-500 transition-opacity dark:bg-sky-400 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />

                      {/* Avatar: photo or initials */}
                      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                        {initials(s.fullName)}
                        {s.image && (
                          <img
                            src={s.image}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </span>

                      {/* Name + GR · Class (Section) */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-slate-800 dark:text-slate-100">
                          {highlight(s.fullName)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="rounded bg-sky-100 px-1.5 font-mono text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                            {s.grNumber}
                          </span>
                          {classText && (
                            <span className="truncate text-[11px] text-amber-700 dark:text-amber-400">
                              {classText}
                            </span>
                          )}
                        </span>
                      </span>

                      {/* Enter hint (selected row only) */}
                      {isActive && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          <CornerDownLeft className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

      const inputClass =
  variant === "page"
    ? "h-10 w-full rounded border px-3.5 text-sm outline-none transition-colors " +
      "border-[color:var(--border)] hover:border-[color:var(--foreground)] " +
      "focus:border-2 focus:px-[13px] focus:border-[#1976d2] dark:focus:border-[#90caf9]"
    : "h-7 w-64 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white focus:outline-none";

  const inputStyle: React.CSSProperties | undefined =
  variant === "page"
    ? {
        backgroundColor: "var(--card)",
        color: "var(--foreground)",
      }
    : undefined;

  return (
    <form
      ref={boxRef}
      onSubmit={handleSubmit}
      className={`relative flex items-center gap-2 ${variant === "page" ? "w-full" : ""}`}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => {
          // Select the whole text on first click
          justFocused.current = true;
          e.currentTarget.select();
          if (options.length > 0) setOpen(true);
        }}
        onMouseUp={(e) => {
          // Browser clears the selection on mouse up — prevent it on the first click only
          if (justFocused.current) {
            e.preventDefault();
            justFocused.current = false;
          }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={inputClass}
        style={inputStyle}
      />

      {dropdown}

      {showSearchButton && (
        <button
          type="submit"
          disabled={loading}
          className="h-7 rounded bg-blue-600 px-3 text-[10px] font-bold uppercase text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Search"}
        </button>
      )}
    </form>
  );
}