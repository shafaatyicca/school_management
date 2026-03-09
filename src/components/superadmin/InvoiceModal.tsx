"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Zoom,
  MenuItem,
  Divider,
} from "@mui/material";
import { Close as CloseIcon, WarningAmber } from "@mui/icons-material";

export default function InvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  schoolPrice,
  allInvoices,
}: any) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const [lastMonthBalance, setLastMonthBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  const planAmount = Number(watch("planAmount") || 0);
  const totalFeedingAmount = Number(watch("totalFeedingAmount") || 0);
  const discount = Number(watch("discount") || 0);
  const splitEnabled = watch("splitEnabled") === "yes";

  useEffect(() => {
    if (isOpen && !initialData && Array.isArray(allInvoices)) {
      const pendingInv = [...allInvoices]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .find((inv) => inv.feedingSplit?.month2 > 0);

      if (pendingInv) {
        setLastMonthBalance(pendingInv.feedingSplit.month2);
      } else {
        setLastMonthBalance(0);
      }
    }
  }, [isOpen, allInvoices, initialData]);

  const currentMonthFeeding = splitEnabled
    ? totalFeedingAmount / 2
    : totalFeedingAmount;
  const nextMonthFeeding = splitEnabled ? totalFeedingAmount / 2 : 0;

  const netPayable =
    planAmount +
    currentMonthFeeding +
    (initialData ? 0 : lastMonthBalance) -
    discount;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          ...initialData,
          totalFeedingAmount:
            (initialData.feedingSplit?.month1 || 0) +
            (initialData.feedingSplit?.month2 || 0),
          splitEnabled: initialData.feedingSplit?.month2 > 0 ? "yes" : "no",
          dueDate: initialData.dueDate
            ? new Date(initialData.dueDate).toISOString().split("T")[0]
            : getTodayDate(),
        });
        setLastMonthBalance(0);
      } else {
        reset({
          planAmount: schoolPrice || 0,
          totalFeedingAmount: 0,
          discount: 0,
          splitEnabled: "no",
          billingMonth: "",
          dueDate: getTodayDate(),
        });
      }
    }
  }, [isOpen, initialData, schoolPrice, reset]);

  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        planAmount: Number(data.planAmount),
        discount: Number(data.discount),
        billingMonth: data.billingMonth,
        dueDate: data.dueDate,
        feedingSplit: {
          month1: currentMonthFeeding + (initialData ? 0 : lastMonthBalance),
          month2: nextMonthFeeding,
        },
      };

      // Parent ko data bhej rahe hain
      await onSubmit(formattedData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Zoom}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#f8fafc",
        }}
      >
        <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">
          {initialData ? "Edit Invoice" : "Invoice Generator"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent dividers sx={{ p: 3 }}>
          <div className="flex flex-col gap-5">
            {lastMonthBalance > 0 && !initialData && (
              <div className="flex items-center gap-3 p-2 bg-red-50 border border-red-200 rounded-md">
                <WarningAmber className="text-red-600" />
                <div>
                  <p className="text-[10px] font-bold text-red-700 uppercase">
                    Carry-Forward Balance
                  </p>
                  <p className="text-sm font-black text-red-900">
                    Rs. {lastMonthBalance}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <TextField
                {...register("billingMonth", { required: true })}
                label="Billing Month"
                size="small"
                placeholder="e.g., April"
                required
              />
              <TextField
                {...register("dueDate", { required: true })}
                label="Due Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                required
              />
            </div>

            <Divider />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                {...register("planAmount")}
                label="Plan Fee"
                type="number"
                size="small"
              />
              <TextField
                {...register("discount")}
                label="Discount"
                type="number"
                size="small"
              />
            </div>

            <Divider />

            <div className="py-3 px-2 bg-indigo-50/50 rounded-md border border-indigo-100">
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  {...register("totalFeedingAmount")}
                  label="Feeding Fee"
                  type="number"
                  size="small"
                />
                <TextField
                  select
                  {...register("splitEnabled")}
                  label="Plan"
                  size="small"
                  defaultValue="no"
                >
                  <MenuItem value="no">Full Payment</MenuItem>
                  <MenuItem value="yes">Half Payment</MenuItem>
                </TextField>
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded-md text-white shadow-xl flex justify-between items-center border-b-4 border-emerald-500">
              <div>
                <p className="text-[12px] text-slate-400 uppercase">
                  Net Payable Amount
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  Plan Fee + Data Feeding - Disc
                </p>
              </div>
              <div className="text-right">
                <span className="text-[20px] text-emerald-400">
                  Rs. {netPayable.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button
            onClick={onClose}
            sx={{ color: "slate.500", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              bgcolor: "#0f172a",
              "&:hover": { bgcolor: "#5a67d8" },
              textTransform: "none",
              px: 2,
              borderRadius: "10px",
            }}
          >
            {isSubmitting
              ? "Saving..."
              : initialData
                ? "Update Invoice"
                : "Generate Invoice"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
