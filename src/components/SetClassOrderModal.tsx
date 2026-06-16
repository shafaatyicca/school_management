"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Zoom,
} from "@mui/material";

interface SetOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: any[];
  orderMap: Record<string, number>;
  setOrderMap: (map: Record<string, number>) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

export default function SetOrderModal({
  isOpen,
  onClose,
  classes,
  orderMap,
  setOrderMap,
  onSave,
  loading,
}: SetOrderModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)", // Same premium blur effect
        },
      }}
      PaperProps={{
        className:
          "bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-300 dark:border-slate-800",
        style: {
          margin: "16px",
          boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DialogTitle
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
        }}
      >
        <span className="font-bold text-foreground text-sm my-2">
          Arrange Classes Sequence
        </span>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          backgroundColor: "var(--background)",
          p: "16px 24px",
          border: "none",
        }}
        className="max-h-[350px] overflow-y-auto space-y-2 pr-2"
      >
        {classes.map((cls) => (
          <div
            key={cls._id}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                {orderMap[cls._id] || 0}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {cls.name}
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                className="w-10 h-8 rounded-md border border-slate-300 bg-white text-center text-slate-800 outline-none focus:border-blue-500 transition-all dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={orderMap[cls._id] || 0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setOrderMap({
                      ...orderMap,
                      [cls._id]: val === "" ? 0 : parseInt(val),
                    });
                  }
                }}
              />
            </div>
          </div>
        ))}
      </DialogContent>

      {/* ================= FOOTER SECTION ================= */}
      <DialogActions
        style={{
          borderTop: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          padding: "8px 24px",
          gap: "8px",
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          size="small"
          style={{
            textTransform: "none",
            color: "var(--foreground)",
            backgroundColor: "transparent",
            fontSize: "0.875rem",
            fontWeight: 500,
            minWidth: "auto",
            padding: "6px 12px",
          }}
          className="hover:bg-[var(--muted)] rounded-md"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={loading}
          size="small"
          style={{
            backgroundColor: "#1e293b",
            textTransform: "none",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            padding: "6px 16px",
          }}
          className="rounded-md"
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#334155")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#1e293b")
          }
        >
          {loading ? "Processing..." : "Save Sequence"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
