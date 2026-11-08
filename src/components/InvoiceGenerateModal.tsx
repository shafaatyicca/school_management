"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Zoom,
  Checkbox,
  FormControlLabel,
  InputAdornment,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { notify } from "@/lib/notify";
import { FileText, Tag, Calendar } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  schoolId: string;
  classFee: number;
  onSuccess: () => void;
  editInvoice?: any; // ho to modal EDIT mode mein khulega
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// Class Fee wali category ke amount box mein yeh text dikhega
const CLASS_FEE_TEXT = "Dynamic Value";

// Locked (readonly) field ka style
const lockedSx = {
  "& .MuiOutlinedInput-root": { backgroundColor: "var(--muted)" },
  "& input, & select": { color: "var(--muted-foreground)" },
};

export default function InvoiceGenerateModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  className,
  section,
  schoolId,
  classFee,
  onSuccess,
  editInvoice,
}: Props) {
  const isEditMode = !!editInvoice;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [isAdvance, setIsAdvance] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedCatName, setSelectedCatName] = useState("");
  const [isClassFee, setIsClassFee] = useState(false);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [titleLocked, setTitleLocked] = useState(true);
  const [customTitle, setCustomTitle] = useState("");
  // Edit mode: sirf is invoice ka discount
  const [invoiceDiscount, setInvoiceDiscount] = useState<number | "">("");

  // Dynamic title
  const monthLabel = MONTHS.find((m) => m.value === month)?.label || "";
  const dynamicTitle = selectedCatName
    ? `${selectedCatName} of ${monthLabel} ${year}`
    : "";

  // Edit mode values
  const editBase = Number(editInvoice?.baseFee || 0);
  const editPaid = Number(editInvoice?.paidAmount || 0);
  const editDiscountNum = Number(invoiceDiscount) || 0;
  const editNet = Math.max(0, editBase - editDiscountNum);

  // Edit mode: month/year na badle to purana title, badle to naya dynamic title
  const monthYearChanged =
    isEditMode &&
    (month !== Number(editInvoice?.month) || year !== Number(editInvoice?.year));
  const lockedTitle = isEditMode
    ? monthYearChanged
      ? dynamicTitle
      : editInvoice?.title || dynamicTitle
    : dynamicTitle;

  // Categories fetch
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    fetch(`/api/Fee_Management/fee-categories?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCategories(list);
        if (isEditMode) return; // edit mein invoice wali category hi rahegi
        // Default: jo category Class Fee se linked hai (jaise Tuition Fee) woh select karo
        const classFeeCat = list.find((c: any) => c.feeSource === "class_fee");
        if (classFeeCat) {
          setSelectedCat(classFeeCat._id);
          setSelectedCatName(classFeeCat.name);
          setIsClassFee(true);
          setAmount(0);
        }
      })
      .catch(() => notify.error("Failed to load categories"));
  }, [isOpen, schoolId, isEditMode]);

  // Edit mode: invoice ki values bhar do
  useEffect(() => {
    if (!isOpen || !editInvoice) return;
    setSelectedCat(
      String(editInvoice.feeCategoryId?._id || editInvoice.feeCategoryId || ""),
    );
    setSelectedCatName(editInvoice.categoryName || "");
    setMonth(Number(editInvoice.month) || currentMonth);
    setYear(Number(editInvoice.year) || currentYear);
    setDate(
      editInvoice.createdAt
        ? new Date(editInvoice.createdAt).toISOString().split("T")[0]
        : now.toISOString().split("T")[0],
    );
    setIsClassFee(false); // edit mein asal amount dikhega
    setAmount(editBase);
    setInvoiceDiscount(editInvoice.discount ?? 0);
    setDescription(editInvoice.description || "");
    setTitleLocked(true);
    setCustomTitle("");
  }, [isOpen, editInvoice]);

  // Category change handler
  const handleCategoryChange = (catId: string) => {
    setSelectedCat(catId);
    if (!catId) {
      setAmount(0);
      setSelectedCatName("");
      setIsClassFee(false);
      return;
    }
    const cat = categories.find((c) => c._id === catId);
    if (cat) {
      setSelectedCatName(cat.name);
      const classFeeCat = cat.feeSource === "class_fee";
      setIsClassFee(classFeeCat);
      setAmount(classFeeCat ? 0 : cat.maxBaseFee || 0);
    }
  };

  // Month / Year change — Advance khud check nahi hoga
  const handleMonthChange = (val: number) => setMonth(val);
  const handleYearChange = (val: number) => setYear(val);

  // ── Create
  const handleGenerate = async () => {
    if (!selectedCat) {
      notify.error("Please select a fee category");
      return;
    }
    if (!isClassFee && (!amount || amount <= 0)) {
      notify.error("Please enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/Fee_Management/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          schoolId,
          month,
          year,
          isAdvance,
          title: titleLocked ? dynamicTitle : customTitle || dynamicTitle,
          date,
          feeCategoryId: selectedCat,
          amount: isClassFee ? 0 : amount,
          description,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        notify.success("Invoice generated successfully!");
        onSuccess();
      } else if (res.status === 409) {
        notify.error(data.message || "Invoice already exists for this month");
      } else {
        notify.error(data.message || "Failed to generate invoice");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Edit (title, date, month, year + is invoice ka discount)
  const handleUpdate = async () => {
    if (editDiscountNum < 0 || editDiscountNum > editBase) {
      notify.error(`Discount 0 se ${editBase} ke beech hona chahiye`);
      return;
    }
    if (editNet < editPaid) {
      notify.error(`Is invoice par ${editPaid} pehle hi pay ho chuka hai`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/Fee_Management/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: editInvoice._id,
          discount: editDiscountNum,
          title: titleLocked ? lockedTitle : customTitle || lockedTitle,
          date,
          month,
          year,
          description,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Invoice updated!");
        onSuccess();
      } else {
        notify.error(data.message || "Failed to update invoice");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const titleValue = titleLocked ? lockedTitle : customTitle;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
        },
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
          py: 1.5,
        }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-600" />
          <span className="font-bold text-foreground text-sm">
            {isEditMode ? "Edit Invoice" : "Generate Invoice"}
          </span>
        </div>
        <IconButton
          onClick={onClose}
          size="small"
          tabIndex={-1}
          sx={{
            color: "var(--muted-foreground)",
            "&:hover": { backgroundColor: "var(--muted)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent
        dividers
        sx={{ backgroundColor: "var(--background)", p: 2 }}
      >
        <div className="flex flex-col gap-3 pt-1">
          {/* Row 1 — Title (double click to edit — create aur edit dono mein) */}
          <TextField
            label={
              titleLocked
                ? "Invoice Title (Double click to edit)"
                : "Invoice Title"
            }
            size="small"
            fullWidth
            value={titleValue}
            onChange={(e) => {
              if (!titleLocked) setCustomTitle(e.target.value);
            }}
            onDoubleClick={() => {
              if (!titleLocked) return;
              setTitleLocked(false);
              setCustomTitle(lockedTitle);
            }}
            InputProps={{
              readOnly: titleLocked,
              startAdornment: (
                <InputAdornment position="start">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ shrink: true }}
            sx={{
              "& input": {
                cursor: titleLocked ? "pointer" : "text",
                backgroundColor: titleLocked ? "var(--muted)" : "inherit",
                color: titleLocked ? "var(--muted-foreground)" : "inherit",
              },
              "& .MuiOutlinedInput-root": {
                backgroundColor: titleLocked ? "var(--muted)" : "inherit",
              },
            }}
          />
          <div className="grid grid-cols-3 gap-3 items-center">
            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Month"
              size="small"
              fullWidth
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </TextField>

            {/* Year input */}
            <TextField
              label="Year"
              type="number"
              size="small"
              fullWidth
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              inputProps={{ min: 2020, max: 2100 }}
              InputLabelProps={{ shrink: true }}
            />
          </div>

          {/* Row 4 — Category + Amount + (Advance / Discount) */}
          <div className="grid grid-cols-3 gap-3">
            <TextField
              select
              label="Fee Category"
              size="small"
              fullWidth
              value={selectedCat}
              disabled={isEditMode}
              onChange={(e) => handleCategoryChange(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={isEditMode ? lockedSx : undefined}
            >
              <option value="">
                {isEditMode ? selectedCatName : "Select Category"}
              </option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </TextField>

            <TextField
              label="Amount"
              size="small"
              fullWidth
              value={isClassFee ? CLASS_FEE_TEXT : amount}
              onChange={(e) => {
                if (!isClassFee && !isEditMode)
                  setAmount(Number(e.target.value));
              }}
              InputProps={{
                readOnly: isClassFee || isEditMode,
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& input": {
                  color:
                    isClassFee || isEditMode
                      ? "var(--muted-foreground)"
                      : "inherit",
                  backgroundColor:
                    isClassFee || isEditMode ? "var(--muted)" : "inherit",
                },
              }}
            />

            {isEditMode ? (
              <TextField
                label="Discount"
                type="number"
                size="small"
                fullWidth
                value={invoiceDiscount}
                onChange={(e) =>
                  setInvoiceDiscount(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                inputProps={{ min: 0, max: editBase }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={isAdvance}
                    onChange={(e) => setIsAdvance(e.target.checked)}
                    sx={{
                      color: "var(--border)",
                      "&.Mui-checked": { color: "#16a34a" },
                    }}
                  />
                }
                label={
                  <span className="text-xs font-bold text-slate-500">
                    Advance
                  </span>
                }
              />
            )}
          </div>

          {/* Row 5 — Class + Section (readonly) */}
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Student"
              size="small"
              fullWidth
              value={studentName}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={lockedSx}
            />
            <TextField
              label="Class"
              size="small"
              fullWidth
              value={className}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={lockedSx}
            />
            <TextField
              label="Section"
              size="small"
              fullWidth
              value={section}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={lockedSx}
            />
          </div>

          {/* Row 7 — Description */}
          <TextField
            label="Invoice Description"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Summary Box */}
          {selectedCat && (
            <div
              className="rounded-lg p-2 border"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Invoice Summary
              </p>

              {isEditMode ? (
                <>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--muted-foreground)" }}>
                      Base Fee
                    </span>
                    <span className="font-semibold text-foreground">
                      Rs. {editBase.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--muted-foreground)" }}>
                      Discount
                    </span>
                    <span className="font-semibold text-pink-500">
                      - Rs. {editDiscountNum.toLocaleString()}
                    </span>
                  </div>
                  {editPaid > 0 && (
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--muted-foreground)" }}>
                        Already Paid
                      </span>
                      <span className="font-semibold text-green-600">
                        Rs. {editPaid.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--muted-foreground)" }}>
                      Net Payable
                    </span>
                    <span className="font-bold text-foreground">
                      Rs. {editNet.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {selectedCatName}
                  </span>
                  <span className="font-bold text-foreground">
                    {isClassFee
                      ? CLASS_FEE_TEXT
                      : `Rs. ${amount.toLocaleString()}`}
                  </span>
                </div>
              )}

              {!isEditMode && isAdvance && (
                <div className="mt-1 text-xs text-green-600 font-medium">
                  ✓ Advance — {monthLabel} {year}
                </div>
              )}
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
          gap: 1,
          px: 2,
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
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEditMode ? handleUpdate : handleGenerate}
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
          {loading
            ? isEditMode
              ? "Updating..."
              : "Generating..."
            : isEditMode
              ? "Update Invoice"
              : "Generate Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}