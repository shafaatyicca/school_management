"use client";
import React from "react";
import { Zap, X as CloseIcon } from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import Zoom from "@mui/material/Zoom";

export default function BulkSchoolInvoiceModal({
  isOpen,
  onClose,
  bulkData,
  setBulkData,
  bulkBillingDate,
  setBulkBillingDate,
  onSubmit,
  isProcessing,
}: {
  isOpen: boolean;
  onClose: () => void;
  bulkData: { month: string; dueDate: string };
  setBulkData: React.Dispatch<
    React.SetStateAction<{ month: string; dueDate: string }>
  >;
  bulkBillingDate: Dayjs | null;
  setBulkBillingDate: React.Dispatch<React.SetStateAction<Dayjs | null>>;
  onSubmit: () => void;
  isProcessing: boolean;
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Zoom}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        className: "rounded-2xl overflow-hidden shadow-2xl",
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          bgcolor: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: "16px 20px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
          <Zap className="text-indigo-600" size={20} fill="currentColor" />
          Bulk Generate
        </div>
        <IconButton onClick={onClose} size="small" sx={{ color: "#64748b" }}>
          <CloseIcon size={18} />
        </IconButton>
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent dividers sx={{ p: 3, bgcolor: "#ffffff" }}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              Billing Month
            </label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                views={["year", "month"]}
                openTo="month"
                defaultValue={dayjs()}
                value={bulkBillingDate}
                onChange={(date) => {
                  setBulkBillingDate(date);
                  if (date) {
                    const month = date
                      .toDate()
                      .toLocaleString("en-US", { month: "long" });
                    const year = date.year();
                    setBulkData((prev) => ({
                      ...prev,
                      month: `${month} ${year}`,
                    }));
                  }
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    sx: {
                      // MUI X v8
                      "& .MuiPickersInputBase-root": {
                        fontSize: "14px",
                      },
                      "& .MuiPickersSectionList-root": {
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#334155",
                        padding: "8.5px 0",
                      },
                      // MUI X v6/v7
                      "& .MuiInputBase-input": {
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#334155",
                      },
                    },
                  },
                  openPickerButton: {
                    size: "small",
                    sx: {
                      padding: "2px",
                      "& svg": { fontSize: "15px" },
                    },
                  },

                  popper: {
                    sx: {
                      "& .MuiDateCalendar-root": {
                        width: "180px",
                        height: "auto",
                        minHeight: "unset",
                      },
                      "& .MuiPickersCalendarHeader-root": {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingLeft: "12px",
                        paddingRight: "8px",
                        marginTop: "8px",
                        marginBottom: "4px",
                        minHeight: "36px",
                      },
                      "& .MuiPickersCalendarHeader-labelContainer": {
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginRight: 0,
                        maxHeight: "none",
                        overflow: "visible",
                        cursor: "pointer",
                      },
                      "& .MuiPickersFadeTransitionGroup-root": {
                        overflow: "visible",
                      },
                      "& .MuiPickersCalendarHeader-label": {
                        whiteSpace: "nowrap",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        marginRight: 0,
                      },
                      "& .MuiPickersCalendarHeader-switchViewButton": {
                        marginLeft: "auto",
                        padding: "4px",
                        color: "#475569",
                        pointerEvents: "auto",
                        "&:hover": { backgroundColor: "#f1f5f9" },
                      },
                      "& .MuiMonthCalendar-root": {
                        width: "180px",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "4px",
                        padding: "8px",
                      },
                      "& .MuiPickersMonth-root": {
                        flexBasis: "unset",
                      },
                      "& .MuiPickersMonth-monthButton, & .MuiMonthCalendar-button":
                        {
                          fontSize: "12px",
                          height: "26px",
                          width: "100%",
                          margin: 0,
                          borderRadius: "6px",
                          fontWeight: 500,
                          color: "#475569",
                          "&:hover": {
                            backgroundColor: "#1e293b",
                            color: "#ffffff",
                          },
                        },
                      "& .MuiPickersMonth-monthButton.Mui-selected, & .MuiMonthCalendar-button.Mui-selected":
                        {
                          backgroundColor: "#1e293b",
                          color: "#ffffff",
                          "&:hover": { backgroundColor: "#334155" },
                        },

                      "& .MuiYearCalendar-root": {
                        width: "180px",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              Due Date
            </label>
            <input
              type="date"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:bg-white transition-all font-medium text-sm text-slate-700 cursor-pointer"
              value={bulkData.dueDate}
              onChange={(e) =>
                setBulkData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>

          {/* Generate Button */}
          <button
            disabled={isProcessing}
            onClick={onSubmit}
            className="w-full mt-3 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                PROCESSING...
              </span>
            ) : (
              "Generate Invoices"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
