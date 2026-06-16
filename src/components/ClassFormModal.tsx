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
  Zoom,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editClass?: any | null;
  isLoading?: boolean;
  schoolId: string | undefined;
}

export default function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  editClass,
  isLoading,
  schoolId,
}: Props) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      sections: "",
      classFee: 0,
      order: 0,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editClass) {
      reset({
        name: editClass.name,
        sections: editClass.sections.join(", "),
        order: editClass.order || 0,
        classFee: editClass.classFee || 0,
      });
    } else {
      reset({ name: "", sections: "", order: 0, classFee: 0 });
    }
  }, [editClass, isOpen, reset]);

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
      classFee: Number(data.classFee || 0),
      schoolId: schoolId,
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
          {editClass ? "Edit Class Details" : "Add New Class"}
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

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent
          dividers
          sx={{ backgroundColor: "var(--background)", p: 2 }}
        >
          <div className="flex flex-col gap-4 py-1">
            <TextField
              {...register("name", { required: true })}
              label="Class Name"
              placeholder="Class 1, Class 2, etc."
              fullWidth
              size="small"
              required
            />

            <TextField
              {...register("sections")}
              label="Sections"
              placeholder="A, B, C, etc."
              fullWidth
              size="small"
              helperText="Separate multiple sections with a comma"
            />

            <TextField
              {...register("classFee", { required: true })}
              label="Class Fee (PKR)"
              type="number"
              fullWidth
              size="small"
              required
              sx={{
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  { display: "none" },
                "& input": { MozAppearance: "textfield" },
              }}
            />
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
              : editClass
                ? "Update Class"
                : "Save Class"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
