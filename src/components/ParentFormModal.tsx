"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Close as CloseIcon } from "@mui/icons-material";
import { zodResolver } from "@hookform/resolvers/zod";
import { parentSchema } from "@/lib/validation";
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(parentSchema),
    mode: "onTouched",
  });

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
              {...register("fullName")}
              label="Full Name"
              fullWidth
              size="small"
              error={!!errors.fullName}
              helperText={errors.fullName?.message as string}
            />

            {/* CNIC + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                {...register("cnic")}
                label="CNIC Number"
                placeholder="42101-xxxxxxx-x"
                size="small"
                error={!!errors.cnic}
                helperText={errors.cnic?.message as string}
              />
              <TextField
                {...register("phone")}
                label="Phone Number"
                size="small"
                error={!!errors.phone}
                helperText={errors.phone?.message as string}
              />
            </div>

            {/* Gender + Occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                select
                label="Gender"
                size="small"
                value={genderValue || "Male"}
                onChange={(e) => setValue("gender", e.target.value)}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </TextField>

              <TextField
                {...register("occupation")}
                label="Occupation"
                size="small"
              />
            </div>

            {/* Address */}
            <TextField
              {...register("address")}
              label="Complete Address"
              multiline
              rows={2}
              fullWidth
              size="small"
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
