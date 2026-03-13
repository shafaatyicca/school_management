"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Zoom,
} from "@mui/material";
import {
  Close as CloseIcon,
  Layers as LayersIcon,
  Add as PlusIcon,
  CheckCircle as CheckIcon,
  Delete as RemoveIcon,
} from "@mui/icons-material";

export const PlanModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
}: any) => {
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (!isOpen) setFeatureInput("");
  }, [isOpen]);

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter(
      (_: any, i: number) => i !== index,
    );
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={300}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        },
      }}
      PaperProps={{
        sx: { borderRadius: "10px", overflow: "hidden" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 3,
          py: 2,
        }}
      >
        <div className="flex items-center gap-3">
          <span className=" text-slate-800 text-[13px] uppercase tracking-wider">
            {isEditing ? "Edit Plan" : "Plan Generator"}
          </span>
        </div>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit}>
        <DialogContent sx={{ p: 4 }}>
          <div className="flex flex-col gap-6">
            {/* Row 1: Plan Name & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Plan Name"
                size="small"
                fullWidth
                required
                placeholder="e.g. Premium"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <TextField
                label="Price (PKR)"
                type="number"
                size="small"
                fullWidth
                required
                placeholder="0.00"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>

            {/* Row 2: Cycle & Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                select
                label="Billing Cycle"
                size="small"
                fullWidth
                value={formData.interval || "month"}
                onChange={(e) =>
                  setFormData({ ...formData, interval: e.target.value })
                }
                SelectProps={{
                  native: true,
                }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </TextField>
              <TextField
                label="Student Limit"
                type="number"
                size="small"
                fullWidth
                placeholder="0 = Unlimited"
                value={formData.schoolLimit || ""}
                onChange={(e) =>
                  setFormData({ ...formData, schoolLimit: e.target.value })
                }
              />
            </div>

            {/* Feature Section like the Dashboard Indigo box */}
            <div className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100 space-y-3">
              <p className="text-[10px] text-indigo-600 uppercase tracking-widest ml-1">
                Include Features
              </p>
              <div className="flex gap-2">
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Type feature..."
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addFeature())
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "10px",
                    },
                  }}
                />
                <Button
                  onClick={addFeature}
                  variant="contained"
                  sx={{
                    minWidth: "40px",
                    height: "35px",
                    borderRadius: "10px",
                    backgroundColor: "#0f172a",
                    "&:hover": { backgroundColor: "#4f46e5" },
                  }}
                >
                  <PlusIcon sx={{ fontSize: 15 }} />
                </Button>
              </div>

              {/* Features Chips */}
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                {formData.features?.map((feat: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-[14px] border border-indigo-100 shadow-sm"
                  >
                    <CheckIcon sx={{ fontSize: 14, color: "#10b981" }} />
                    {feat}
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <RemoveIcon sx={{ fontSize: 15 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            gap: 1.5,
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: "#0f172a",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "uppercase",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "1px",
              px: 2,
              py: 1.2,
              borderRadius: "12px",
            }}
          >
            {isEditing ? "Update Plan" : "Generate Plan"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
