"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, IconButton, Zoom, InputAdornment,
  ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Receipt } from "lucide-react";
import { notify } from "@/lib/notify";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  className: string;
  schoolId: string;
  classFee: number;
  onSuccess: () => void;
  editDiscount?: any;
}

export default function DiscountAddModal({
  isOpen, onClose, studentId, studentName,
  className, schoolId, classFee, onSuccess, editDiscount,
}: ModalProps) {
  const isEditMode = !!editDiscount;

  const [categories,      setCategories]      = useState<any[]>([]);
  const [selectedBaseFee, setSelectedBaseFee] = useState(0);
  const [feeCategoryId,   setFeeCategoryId]   = useState("");
  const [discountType,    setDiscountType]    = useState("fixed");
  const [discountValue,   setDiscountValue]   = useState<number | "">("");
  const [remarks,         setRemarks]         = useState("");
  const [loading,         setLoading]         = useState(false);

  // Categories fetch
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    fetch(`/api/Fee_Management/fee-categories?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => notify.error("Failed to load categories"));
  }, [isOpen, schoolId]);

  // Edit data fill
 useEffect(() => {
  if (!isOpen) return;
  if (isEditMode && editDiscount && categories.length > 0) {
    setFeeCategoryId(editDiscount.feeCategoryId?._id || "");
    const baseFee = editDiscount.baseFee || classFee;
    const netFee  = editDiscount.customNetFee || 0;
    const fallbackValue = baseFee - netFee; // fixed discount calculate karo
    setDiscountType(editDiscount.discountType || "fixed");
    setDiscountValue(editDiscount.discountValue ?? fallbackValue);
    setRemarks(editDiscount.remarks || "");
    setSelectedBaseFee(baseFee);
    setRemarks(editDiscount.remarks || "");
    setSelectedBaseFee(editDiscount.baseFee || classFee);
  } else if (!isEditMode) {
    setFeeCategoryId("");
    setDiscountType("fixed");
    setDiscountValue("");
    setRemarks("");
    setSelectedBaseFee(0);
  }
}, [isOpen, editDiscount, categories]);

  const handleCategoryChange = (catId: string) => {
    setFeeCategoryId(catId);
    const cat = categories.find((c) => c._id === catId);
    setSelectedBaseFee(cat?.maxBaseFee || classFee);
  };

  const calculateNetFee = () => {
    const val = Number(discountValue) || 0;
    const base = selectedBaseFee || classFee;
    if (discountType === "fixed") return Math.max(0, base - val);
    return Math.max(0, base - (base * val) / 100);
  };

  const handleSubmit = async () => {
    if (!feeCategoryId) return notify.error("Please select a category");
    if (discountValue === "" || discountValue === 0)
      return notify.error("Please enter discount value");

    setLoading(true);
    const payload = {
      studentId, schoolId, feeCategoryId,
      baseFee: selectedBaseFee || classFee,
      customNetFee: calculateNetFee(),
      discountType,
      discountValue: Number(discountValue),
      remarks,
    };

    try {
      const res = await fetch("/api/Fee_Management/discounts", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditMode ? { id: editDiscount._id, ...payload } : payload
        ),
      });
      if (res.ok) {
        notify.success(isEditMode ? "Discount updated!" : "Discount applied!");
        onSuccess();
      } else {
        notify.error("Error saving discount");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const netFee = calculateNetFee();
  const discountAmt = (selectedBaseFee || classFee) - netFee;

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
          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-none">
              {isEditMode ? "Edit Discount" : "Apply Discount"}
            </p>
            
          </div>
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
      <DialogContent dividers sx={{ backgroundColor: "var(--background)", p: 2 }}>
        <div className="flex items-center gap-2 mb-3 justify-center">
          <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">
            {studentName}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-sky-100 text-sky-700  dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            {className}
          </span>
        </div>
        <div className="flex flex-col gap-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <TextField
              select
              label="Fee Category"
              size="small"
              fullWidth
              value={feeCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </TextField>

            <TextField
              label={discountType === "fixed" ? "Discount Amount" : "Discount %"}
              type="number"
              size="small"
              fullWidth
              value={discountValue}
              onChange={(e) =>
                setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {discountType === "fixed" ? "Rs." : "%"}
                    </span>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ shrink: true }}
            />
          </div>

           <ToggleButtonGroup
            value={discountType}
            exclusive
            onChange={(_, val) => { if (val) setDiscountType(val); }}
            size="small"
            fullWidth
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontSize: "12px",
                py: 0.5,
                color: "var(--muted-foreground)",
                borderColor: "var(--border)",
                mb: 1,
                "&.Mui-selected": {
                  backgroundColor: "rgba(2,132,199,0.12)",
                  color: "#0284c7",
                  borderColor: "#0284c7",
                  fontWeight: 700,
                },
              },
            }}
          >
            <ToggleButton value="fixed">Fixed Amount</ToggleButton>
            <ToggleButton value="percentage">Percentage %</ToggleButton>
          </ToggleButtonGroup>

         
          <TextField
            label="Discount Remarks"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Summary Box */}
          {feeCategoryId && (
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                Fee Summary
              </div>
              <div className="px-3 py-2 space-y-1.5" style={{ backgroundColor: "var(--card)" }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--muted-foreground)" }}>Maximum Fee</span>
                  <span className="font-semibold text-foreground">
                    {(selectedBaseFee || classFee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--muted-foreground)" }}>Discount</span>
                  <span className="font-semibold text-pink-500">
                    {discountAmt > 0 ? discountAmt.toLocaleString() : "0"}
                  </span>
                </div>
                <div
                  className="flex justify-between text-sm font-bold pt-1.5 mt-1 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-foreground">Net Payable</span>
                  <span className="text-green-600">
                    {netFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          gap: 1, px: 2, py: 1,
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
          }}
        >
          {loading ? "Saving..." : isEditMode ? "Update Discount" : "Apply Discount"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}