"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, IconButton, Zoom, InputAdornment,
} from "@mui/material";
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { CreditCard } from "lucide-react";
import { notify } from "@/lib/notify";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

const METHODS = [
  { value: "cash",   label: "Cash" },
  { value: "bank",   label: "Bank Transfer" },
  { value: "online", label: "Online" },
];

export default function TakePaymentModal({
  isOpen, onClose, invoice, onSuccess,
}: Props) {
  const now = new Date().toISOString().split("T")[0];

  const [amount,  setAmount]  = useState<number | "">(invoice?.remainingAmount || "");
  const [method,  setMethod]  = useState("cash");
  const [date,    setDate]    = useState(now);
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      notify.error("Please enter a valid amount");
      return;
    }
    if (Number(amount) > invoice.remainingAmount) {
      notify.error(`Maximum payable amount is ${invoice.remainingAmount.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/Fee_Management/take-payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice._id,
          amount: Number(amount),
          method,
          date,
          note,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        notify.success("Payment recorded successfully!");
        onSuccess();
      } else {
        notify.error(data.message || "Failed to record payment");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: { backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          py: 1.5, px: 2,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-bold text-foreground text-sm">Take Payment</p>
        </div>
        <IconButton
          onClick={onClose}
          size="small"
          tabIndex={-1}
          sx={{ color: "var(--muted-foreground)", "&:hover": { backgroundColor: "var(--muted)" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent dividers sx={{ backgroundColor: "var(--background)", p: 1 }}>
        <div className="flex flex-col gap-3 pt-1">

          {/* Invoice Info */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              Invoice Details
            </div>
            <div className="px-3 py-2 space-y-1.5" style={{ backgroundColor: "var(--card)" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Title</span>
                <span className="font-medium text-foreground">{invoice.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Category</span>
                <span className="font-medium text-foreground">{invoice.categoryName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Net Payable</span>
                <span className="font-bold text-foreground">
                  Rs. {invoice.netPayable?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Paid</span>
                <span className="font-bold text-green-600">
                  Rs. {invoice.paidAmount?.toLocaleString()}
                </span>
              </div>
              <div
                className="flex justify-between text-sm font-bold border-t pt-1.5"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-foreground">Remaining</span>
                <span className="text-red-500">
                  Rs. {invoice.remainingAmount?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        <div className="flex gap-3"> 
          {/* Date */}
          <TextField
            label="Payment Date"
            type="date"
            size="small"
            fullWidth
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Amount */}
          <TextField
            label="Amount"
            type="number"
            size="small"
            fullWidth
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            inputProps={{ min: 1, max: invoice.remainingAmount }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Rs.
                  </span>
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ shrink: true }}
            helperText={`Max: Rs. ${invoice.remainingAmount?.toLocaleString()}`}
          />
          </div>
          {/* Method */}
          <FormGroup row className="flex justify-center">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={method === "cash"}
                  onChange={() => setMethod("cash")}
                />
              }
              label="Cash"
            />

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={method === "bank"}
                  onChange={() => setMethod("bank")}
                />
              }
              label="Bank"
            />

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={method === "online"}
                  onChange={() => setMethod("online")}
                />
              }
              label="Online"
            />
          </FormGroup>

          {/* Note */}
          <TextField
            label="Note (Optional)"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

        </div>
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          gap: 1, 
          px: 1, 
          py: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{
            textTransform: "none",
            color: "var(--foreground)",
            "&:hover": { backgroundColor: "var(--muted)" },
            px: 2,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          size="small"
          sx={{
            backgroundColor: "#1e293b", 
            "&:hover": { backgroundColor: "#334155" },
            textTransform: "none",
            px: 2,
            py: 0.5,
          }}
        >
          {loading ? "Processing..." : "Confirm Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}