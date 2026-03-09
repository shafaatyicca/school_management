"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
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
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  Business as SchoolIcon,
  Payments as PayIcon,
} from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  school?: any | null;
  plans: any[];
  isLoading?: boolean;
}

export default function SchoolFormModal({
  isOpen,
  onClose,
  onSubmit,
  school,
  plans,
  isLoading,
}: Props) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: useMemo(
      () => ({
        name: "",
        phone: "",
        address: "",
        logo: "",
        status: "active",
        planId: "",
        customPrice: 0,
        expiryDate: "",
        // subscriptionStatus yahan se khatam
      }),
      [],
    ),
  });

  const currentStatus = watch("status");
  const selectedPlanId = watch("planId");
  const currentLogo = watch("logo");

  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const selectedPlan = plans.find((p) => p._id === selectedPlanId);
      if (selectedPlan) {
        setValue("customPrice", selectedPlan.price);
      }
    }
  }, [selectedPlanId, plans, setValue]);

  useEffect(() => {
    if (!isOpen) return;
    if (school) {
      reset({
        ...school,
        planId: school.planId?._id || school.planId || "",
        expiryDate: school.expiryDate
          ? new Date(school.expiryDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      reset({
        name: "",
        phone: "",
        address: "",
        logo: "",
        status: "active",
        planId: "",
        customPrice: 0,
        expiryDate: "",
      });
    }
  }, [school, isOpen, reset]);

  const onFormSubmit = useCallback(
    (data: any) => {
      const formattedData = {
        ...data,
        id: school?._id,
        customPrice: Number(data.customPrice),
      };
      onSubmit(formattedData);
    },
    [onSubmit, school],
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("logo", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="font-bold text-sm flex items-center gap-2">
          <SchoolIcon fontSize="small" />
          {school ? "Update Institution" : "Register New Institution"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent dividers sx={{ p: 2 }}>
          <div className="flex flex-col gap-4">
            {/* Logo Section remain same... */}
            <div className="flex items-center gap-2 p-2 border rounded-2xl border-dashed bg-slate-50/50">
              {/* ... (Same logo code as before) ... */}
              <div className="w-20 h-20 rounded-2xl bg-white border flex items-center justify-center overflow-hidden">
                {currentLogo ? (
                  <img
                    src={currentLogo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <SchoolIcon sx={{ fontSize: 40, color: "#cbd5e1" }} />
                )}
              </div>
              <input
                type="file"
                className="hidden"
                id="logo-up"
                onChange={handleLogoUpload}
              />
              <label
                htmlFor="logo-up"
                className="bg-indigo-600 text-white p-1 rounded-md cursor-pointer"
              >
                <PayIcon sx={{ fontSize: 14 }} />
              </label>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Institution Identity
                </p>
                <p className="text-[10px] text-slate-400">
                  Square logo (PNG/JPG)
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <TextField
              {...register("name", { required: true })}
              label="School Name"
              fullWidth
              size="small"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                {...register("phone", { required: true })}
                label="Contact Number"
                size="small"
                required
              />
              <TextField
                {...register("status")}
                select
                label="Operational Status"
                size="small"
                value={currentStatus || "active"}
                onChange={(e) => setValue("status", e.target.value)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </div>
            <TextField
              {...register("address", { required: true })}
              label="Complete Address"
              multiline
              rows={2}
              fullWidth
              size="small"
              required
            />

            {/* Subscription Section - CLEANED */}
            <div className="mt-4 p-4 border rounded-2xl bg-slate-50 space-y-4">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <PayIcon sx={{ fontSize: 18, color: "#4f46e5" }} /> Plan &
                Expiry
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  {...register("planId", { required: true })}
                  select
                  label="Choose Plan"
                  size="small"
                  fullWidth
                  value={selectedPlanId || ""}
                  onChange={(e) => setValue("planId", e.target.value)}
                >
                  {plans.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name} — ${p.price}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  {...register("customPrice", { required: true })}
                  label="Final Price ($)"
                  type="number"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                />

                {/* Expiry Date Full Width or nicely aligned */}
                <TextField
                  {...register("expiryDate", { required: true })}
                  label="Expiry Date"
                  type="date"
                  size="small"
                  fullWidth
                  className="md:col-span-2" // Isko full width kar diya taake subscriptionStatus ki jagah fill ho jaye
                  InputLabelProps={{ shrink: true }}
                  onClick={(e: any) => e.target.showPicker?.()}
                />
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={isLoading}
            size="small"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            size="small"
            sx={{ backgroundColor: "#1e293b", textTransform: "none", px: 3 }}
          >
            {isLoading
              ? "Processing..."
              : school
                ? "Update Details"
                : "Register School"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
