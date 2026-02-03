"use client";
import { useEffect } from "react";
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
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  parent?: any;
  isLoading?: boolean;
}

export default function ParentFormModal({
  isOpen,
  onClose,
  onSubmit,
  parent,
  isLoading,
}: Props) {
  // 1. watch aur setValue zaroori hain MUI Select ki coordination ke liye
  const { register, handleSubmit, reset, watch, setValue } = useForm();

  // 2. Gender ki current value ko track karna
  const genderValue = watch("gender");

  useEffect(() => {
    if (isOpen) {
      if (parent) {
        reset(parent);
      } else {
        reset({
          fullName: "",
          cnic: "",
          phone: "",
          occupation: "",
          gender: "Male",
          address: "",
        });
      }
    }
  }, [parent, isOpen, reset]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // Accessibility aur focus management
      disableEnforceFocus={false}
    >
      <DialogTitle className="flex justify-between items-center bg-slate-50 border-b">
        <span className="font-bold text-slate-700">
          {parent ? "Edit Parent Details" : "Register New Parent"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <div className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="w-full">
              <TextField
                {...register("fullName", { required: true })}
                label="Full Name"
                fullWidth
                size="small"
                required
              />
            </div>

            {/* CNIC and Phone */}
            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                {...register("cnic", { required: true })}
                label="CNIC Number"
                placeholder="42101-xxxxxxx-x"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
              <TextField
                {...register("phone", { required: true })}
                label="Phone Number"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
            </div>

            {/* Gender and Occupation */}
            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                select
                label="Gender"
                className="w-full sm:w-1/2"
                size="small"
                required
                value={genderValue || ""} // Manual value link ki
                onChange={(e) => setValue("gender", e.target.value)} // Manual update link kiya
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>

              <TextField
                {...register("occupation")}
                label="Occupation"
                className="w-full sm:w-1/2"
                size="small"
              />
            </div>

            {/* Address */}
            <div className="w-full">
              <TextField
                {...register("address", { required: true })}
                label="Complete Address"
                multiline
                rows={2}
                fullWidth
                size="small"
                required
              />
            </div>
          </div>
        </DialogContent>

        <DialogActions className="p-4 bg-slate-50">
          <Button onClick={onClose} color="inherit" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{
              backgroundColor: "#2563eb",
              textTransform: "none",
              fontWeight: "600",
              "&:hover": { backgroundColor: "#1d4ed8" },
            }}
          >
            {isLoading ? "Saving..." : parent ? "Update Parent" : "Save Parent"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
