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
        joiningDate: "",
        slug: "",
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
        joiningDate: school.joiningDate
          ? new Date(school.joiningDate).toISOString().split("T")[0]
          : "",
        slug: school.slug || "",
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
        joiningDate: "",
        slug: "",
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
        <DialogContent dividers sx={{ py: 1, px: 2 }}>
          <div className="flex flex-col gap-4">
            {/* ✅ Top Row: Image Left + Fields Right */}
            <div className="flex flex-row gap-4 items-start">
              {/* Left: Logo */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 bg-white overflow-hidden hover:border-sky-400">
                    {currentLogo ? (
                      <img
                        src={currentLogo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <label
                        htmlFor="logo-up"
                        className="flex flex-col items-center justify-center cursor-pointer w-full h-full"
                      >
                        <span className="text-3xl text-slate-400">+</span>
                        <span className="text-[10px] text-slate-400">
                          Add Photo
                        </span>
                      </label>
                    )}
                  </div>

                  {currentLogo && (
                    <>
                      <label
                        htmlFor="logo-up"
                        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <span className="text-white text-xs font-medium">
                          Change
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setValue("logo", "")}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer shadow-sm z-10 text-xs"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-2 text-slate-400">
                  School Logo
                </p>
                <input
                  type="file"
                  className="hidden"
                  id="logo-up"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Right: Phone + Status */}
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <TextField
                  {...register("phone", { required: true })}
                  label="Contact Number"
                  size="small"
                  fullWidth
                  required
                />
                <TextField
                  {...register("status")}
                  select
                  label="Operational Status"
                  size="small"
                  fullWidth
                  value={currentStatus || "active"}
                  onChange={(e) => setValue("status", e.target.value)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </div>
            </div>

            {/* ✅ Baaki fields neeche */}
            <TextField
              {...register("name", { required: true })}
              label="School Name"
              fullWidth
              size="small"
              required
            />
            <TextField
              {...register("slug", { required: true })}
              label="School Slug"
              size="small"
              fullWidth
              required
              placeholder="e.g. city-model-school"
            />
            <TextField
              {...register("address", { required: true })}
              label="Complete Address"
              multiline
              rows={2}
              fullWidth
              size="small"
              required
            />

            {/* Subscription Section */}
            <div className=" p-2 border rounded-md bg-slate-50 space-y-2">
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
                  label="Final Price (PKR)"
                  type="number"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">PKR</InputAdornment>
                    ),
                  }}
                />

                <TextField
                  {...register("expiryDate", { required: true })}
                  label="Expiry Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  onClick={(e: any) => e.target.showPicker?.()}
                />
                <TextField
                  {...register("joiningDate")}
                  label="Joining Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
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
