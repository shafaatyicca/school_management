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
import { FileText, Tag, Calendar, AlignLeft } from "lucide-react";

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
}: Props) {
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
  const [isTuition, setIsTuition] = useState(false);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [titleLocked, setTitleLocked] = useState(true);
  const [customTitle, setCustomTitle] = useState("");

  // Dynamic title
  const monthLabel = MONTHS.find((m) => m.value === month)?.label || "";
  const dynamicTitle = selectedCatName
    ? `${selectedCatName} of ${monthLabel} ${year}`
    : "";

  // Categories fetch
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    fetch(`/api/Fee_Management/fee-categories?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        // Default tuition fee select karo
        const tuition = data.find((c: any) =>
          c.name.toLowerCase().includes("tuition"),
        );
        if (tuition) {
          setSelectedCat(tuition._id);
          setSelectedCatName(tuition.name);
          setIsTuition(true);
          setAmount(classFee);
        }
      })
      .catch(() => notify.error("Failed to load categories"));
  }, [isOpen, schoolId]);

  // Category change handler
  const handleCategoryChange = (catId: string) => {
    setSelectedCat(catId);
    if (!catId) {
      setAmount(0);
      setSelectedCatName("");
      setIsTuition(false);
      return;
    }
    const cat = categories.find((c) => c._id === catId);
    if (cat) {
      setSelectedCatName(cat.name);
      const isTuitionCat = cat.name.toLowerCase().includes("tuition");
      setIsTuition(isTuitionCat);
      setAmount(isTuitionCat ? classFee : cat.maxBaseFee || 0);
    }
  };

  // Month change — user directly select karega
  const handleMonthChange = (val: number) => {
    setMonth(val);
    if (val !== currentMonth || year !== currentYear) {
      setIsAdvance(true);
    } else {
      setIsAdvance(false);
    }
  };

  // Year change
  const handleYearChange = (val: number) => {
    setYear(val);
    if (val !== currentYear || month !== currentMonth) {
      setIsAdvance(true);
    } else {
      setIsAdvance(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCat) {
      notify.error("Please select a fee category");
      return;
    }
    if (!amount || amount <= 0) {
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
          amount,
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
            Generate Invoice
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
          {/* Row 1 — Dynamic Title (readonly) */}
          <TextField
            label={
              titleLocked
                ? "Invoice Title (Double click to edit)"
                : "Invoice Title"
            }
            size="small"
            fullWidth
            value={titleLocked ? dynamicTitle : customTitle}
            onChange={(e) => {
              if (!titleLocked) setCustomTitle(e.target.value);
            }}
            onDoubleClick={() => {
              setTitleLocked(false);
              setCustomTitle(dynamicTitle);
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

          {/* Row 4 — Category + Amount */}
          <div className="grid grid-cols-3 gap-3">
            <TextField
              select
              label="Fee Category"
              size="small"
              fullWidth
              value={selectedCat}
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
              label="Amount"
              size="small"
              fullWidth
              value={amount}
              onChange={(e) => {
                if (!isTuition) setAmount(Number(e.target.value));
              }}
              InputProps={{
                readOnly: isTuition,
                
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& input": {
                  color: isTuition ? "var(--muted-foreground)" : "inherit",
                  backgroundColor: isTuition ? "var(--muted)" : "inherit",
                },
              }}
            />

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
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "var(--muted)",
                },
                "& input": {
                  color: "var(--muted-foreground)",
                },
              }}
            />
            <TextField
              label="Class"
              size="small"
              fullWidth
              value={className}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "var(--muted)",
              },
              "& input": {
                color: "var(--muted-foreground)",
              },
            }}
            />
            <TextField
              label="Section"
              size="small"
              fullWidth
              value={section}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "var(--muted)",
                },
                "& input": {
                  color: "var(--muted-foreground)",
                },
              }}
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
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>
                  {selectedCatName}
                </span>
                <span className="font-bold text-foreground">
                  Rs. {amount.toLocaleString()}
                </span>
              </div>
              {isAdvance && (
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
          onClick={handleGenerate}
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
          {loading ? "Generating..." : "Generate Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
