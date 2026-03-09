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
  InputAdornment,
  Alert,
  CircularProgress,
} from "@mui/material";
import { X as CloseIcon, Banknote, AlertTriangle } from "lucide-react";

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaid,
}: any) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const [loading, setLoading] = useState(false);
  const enteredAmount = watch("amountToPay");

  const getTodayDate = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  useEffect(() => {
    if (isOpen && invoice) {
      reset({
        amountToPay: invoice.remainingAmount,
        paymentDate: getTodayDate(),
        note: "",
      });
    }
  }, [isOpen, invoice, reset]);

  const isOverPaying = Number(enteredAmount) > (invoice?.remainingAmount || 0);

  // --- ACTUAL PAYMENT LOGIC ---
  const onSubmit = async (data: any) => {
    if (isOverPaying) return;

    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay", // Lazmi hai API logic k liye
          invoiceId: invoice._id,
          amountToPay: Number(data.amountToPay),
          paymentDate: data.paymentDate,
          note: data.note,
        }),
      });

      if (res.ok) {
        onPaid(); // Parent table refresh karne k liye
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Zoom}
      maxWidth="xs"
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
        <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase text-sm">
          <Banknote size={20} /> Record Payment
        </div>
        <IconButton onClick={onClose} size="small">
          <CloseIcon size={18} />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ p: 3 }}>
          <div className="flex flex-col gap-5">
            <div className="bg-slate-900 p-2 rounded-md text-white shadow-md border-l-4 border-emerald-500">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Total Balance
              </p>
              <p className="text-[20px] text-emerald-400">
                Rs. {invoice.remainingAmount?.toLocaleString()}
              </p>
            </div>

            {isOverPaying && (
              <Alert
                severity="error"
                icon={<AlertTriangle size={18} />}
                className="rounded-lg font-bold text-[11px]"
              >
                Amount cannot be greater than Rs. {invoice.remainingAmount}
              </Alert>
            )}

            <TextField
              {...register("amountToPay", { required: true, min: 1 })}
              label="Amount to Pay"
              type="number"
              fullWidth
              size="small"
              error={isOverPaying}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">Rs</InputAdornment>
                ),
              }}
            />

            <TextField
              {...register("paymentDate", { required: true })}
              label="Payment Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              {...register("note")}
              label="Payment Note"
              placeholder="e.g. Bank Transfer / Cash"
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{ textTransform: "none", color: "slate.500" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isOverPaying || !enteredAmount || loading}
            sx={{
              bgcolor: isOverPaying ? "#94a3b8" : "#0f172a",
              "&:hover": { bgcolor: "#5a67d8" },
              textTransform: "none",
              borderRadius: "10px",
              px: 2,
              fontWeight: "bold",
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : isOverPaying ? (
              "Invalid Amount"
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
