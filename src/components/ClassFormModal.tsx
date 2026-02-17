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
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Refreshing the table
  editClass?: any | null;
  isLoading?: boolean;
}

export default function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  editClass,
  isLoading,
}: Props) {
  // 1. React Hook Form setup exactly like Parent Modal
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (isOpen) {
      if (editClass) {
        reset({
          name: editClass.name,
          sections: editClass.sections.join(", "), // Array to string
          order: editClass.order || 0,
        });
      } else {
        reset({
          name: "",
          sections: "",
          order: 0,
        });
      }
    }
  }, [editClass, isOpen, reset]);

  // 2. Form submission logic
  const onFormSubmit = async (data: any) => {
    const sectionsArray = data.sections
      ? data.sections
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    const payload = {
      id: editClass?._id,
      name: data.name,
      sections: sectionsArray,
      order: Number(data.order),
    };

    try {
      const res = await fetch("/api/classes", {
        method: editClass ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Failed to save class:", error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableEnforceFocus={false}
    >
      <DialogTitle className="flex justify-between items-center bg-slate-50 border-b">
        <span className="font-bold text-foreground text-sm">
          {editClass ? "Edit Class Details" : "Add New Class"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent dividers>
          <div className="flex flex-col gap-5 py-2">
            {/* Class Name - Full Width */}
            <TextField
              {...register("name", { required: true })}
              label="Class Name"
              placeholder="Class 1, Class 2, etc."
              fullWidth
              size="small"
              required
            />

            {/* Sections - Full Width */}
            <TextField
              {...register("sections")}
              label="Sections"
              placeholder="A, B, C, etc."
              fullWidth
              size="small"
              helperText="Separate multiple sections with a comma"
            />

            {/* Order - Full Width */}
            <TextField
              {...register("order")}
              label="Sort Order"
              type="number"
              fullWidth
              size="small"
              placeholder="0"
              sx={{
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  {
                    display: "none",
                  },
                "& input": { MozAppearance: "textfield" },
              }}
            />
          </div>
        </DialogContent>

        <DialogActions className="p-2 bg-slate-50">
          <Button
            onClick={onClose}
            color="inherit"
            disabled={isLoading}
            size="small"
          >
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
            {isLoading
              ? "Saving..."
              : editClass
                ? "Update Class"
                : "Save Class"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
