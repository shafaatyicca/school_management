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
  Zoom,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  parent?: any;
  isLoading?: boolean;
  schoolId: string | null;
}

export default function ParentFormModal({
  isOpen,
  onClose,
  onSubmit,
  parent,
  isLoading,
  schoolId,
}: Props) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const genderValue = watch("gender");

  useEffect(() => {
    if (!isOpen) return;
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
  }, [parent, isOpen, reset]);
  const handleFormSubmit = (data: any) => {
    onSubmit({ ...data, schoolId });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
        }}
      >
        <span className="font-bold text-foreground text-sm">
          {parent ? "Edit Parent Details" : "Register New Parent"}
        </span>
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

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent
          dividers
          sx={{ backgroundColor: "var(--background)", p: 2 }}
        >
          <div className="flex flex-col gap-4">
            {/* Full Name */}
            <TextField
              {...register("fullName", { required: true })}
              label="Full Name"
              fullWidth
              size="small"
              required
            />

            {/* CNIC + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                {...register("cnic", { required: true })}
                label="CNIC Number"
                placeholder="42101-xxxxxxx-x"
                size="small"
                required
              />
              <TextField
                {...register("phone", { required: true })}
                label="Phone Number"
                size="small"
                required
              />
            </div>

            {/* Gender + Occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                select
                label="Gender"
                size="small"
                required
                value={genderValue || "Male"}
                onChange={(e) => setValue("gender", e.target.value)}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>

              <TextField
                {...register("occupation")}
                label="Occupation"
                size="small"
              />
            </div>

            {/* Address */}
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
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: "1px solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
            gap: 1,
          }}
        >
          <Button
            onClick={onClose}
            disabled={isLoading}
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
            type="submit"
            variant="contained"
            disabled={isLoading}
            size="small"
            sx={{
              backgroundColor: "#1e293b",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "none",
              px: 1,
              py: 0.5,
            }}
          >
            {isLoading
              ? "Processing..."
              : parent
                ? "Update Parent"
                : "Register"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
