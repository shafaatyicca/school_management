"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@mui/material";
import { ShieldAlert } from "lucide-react";
import { ACCESS_DENIED_EVENT, showAccessDenied } from "@/lib/accessDenied";

const DEFAULT_MESSAGE = "You don't have permission for this action.";

export default function AccessDeniedModal() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  // Watch every API call: a 403 opens this modal
  useEffect(() => {
    const original = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      try {
        const input = args[0];
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (res.status === 403 && url.includes("/api/")) {
          // Read a COPY of the body — the page still gets the original response
          const data = await res.clone().json().catch(() => null);
          showAccessDenied(data?.message || data?.error);
        }
      } catch {
        /* never break the request */
      }
      return res;
    };

    // Put the normal fetch back when the layout unmounts
    return () => {
      window.fetch = original;
    };
  }, []);

  // Open on the event
  useEffect(() => {
    const onDenied = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      setMessage(msg && msg !== "Forbidden" ? msg : DEFAULT_MESSAGE);
      setOpen(true);
    };
    window.addEventListener(ACCESS_DENIED_EVENT, onDenied);
    return () => window.removeEventListener(ACCESS_DENIED_EVENT, onDenied);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      sx={{
        "& .MuiPaper-root": {
          borderRadius: "16px",
          backgroundColor: "var(--card)",
          backgroundImage: "none",
          border: "1px solid var(--border)",
        },
      }}
    >
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15">
          <ShieldAlert className="h-7 w-7 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {message}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Please contact your administrator if you need access.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 h-9 w-full rounded-lg bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 cursor-pointer"
        >
          OK
        </button>
      </div>
    </Dialog>
  );
}