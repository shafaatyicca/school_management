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
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import type { IEmployee } from "@/models/Employee";
import ImageUploadWithCrop from "./ImageUploadWithCrop";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  employee?: IEmployee | null;
  isLoading?: boolean;
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading,
}: Props) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();

  const staffCategory = watch("staffCategory");
  const currentStatus = watch("status");
  const currentRole = watch("role");
  const currentGender = watch("gender");
  const currentImage = watch("image");

  const defaultValues = useMemo(
    () => ({
      image: "",
      fullName: "",
      phone: "",
      role: "employee",
      dateOfBirth: "",
      gender: "male",
      nicNumber: "",
      staffCategory: "teacher",
      designation: "",
      qualification: "",
      experience: 0,
      subject: "",
      address: "",
      salary: 0,
      joiningDate: new Date().toISOString().split("T")[0],
      status: "active",
      inactiveDate: "",
      inactiveReason: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
    }),
    [],
  );

  const handleImageDone = useCallback(
    (blob: Blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        setValue("image", reader.result as string, { shouldDirty: true });
      };
    },
    [setValue],
  );

  useEffect(() => {
    if (!isOpen) return; // Modal band hai to skip karo

    if (employee) {
      reset({
        ...employee,
        image: employee.image || "",
        dateOfBirth: employee.dateOfBirth
          ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
          : "",
        joiningDate: employee.joiningDate
          ? new Date(employee.joiningDate).toISOString().split("T")[0]
          : "",
        inactiveDate: employee.inactiveDate
          ? new Date(employee.inactiveDate).toISOString().split("T")[0]
          : "",
        inactiveReason: employee.inactiveReason || "",
        emergencyContactName: employee.emergencyContact?.name || "",
        emergencyContactPhone: employee.emergencyContact?.phone || "",
        emergencyContactRelation: employee.emergencyContact?.relation || "",
      });
    } else {
      reset(defaultValues);
    }
  }, [employee?._id, isOpen, reset, defaultValues]);

  useEffect(() => {
    if (!isOpen) return;
    if (!employee) return;
  }, [isOpen, employee]);

  const onFormSubmit = useCallback(
    (data: any) => {
      if (data.staffCategory !== "teacher") {
        data.subject = "";
      }

      if (!data.image) {
        data.image =
          data.gender === "female" ? "/female-avatar.jpg" : "/male-avatar.jpg";
      }

      const formattedData = {
        ...data,
        salary: Number(data.salary),
        experience: Number(data.experience),
        emergencyContact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone,
          relation: data.emergencyContactRelation,
        },
      };

      delete formattedData.emergencyContactName;
      delete formattedData.emergencyContactPhone;
      delete formattedData.emergencyContactRelation;

      onSubmit(formattedData);

      if (!employee) {
        reset(defaultValues);
      }
    },
    [employee, onSubmit, reset, defaultValues],
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      TransitionComponent={Zoom} // 👈 Ye line add karein
      transitionDuration={200} // Speed set karein
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
          {employee ? "Edit Employee Details" : "Register New Employee"}
        </span>
        <IconButton
          onClick={onClose}
          size="small"
          tabIndex={-1}
          sx={{
            color: "var(--muted-foreground)",
            "&:hover": {
              backgroundColor: "var(--muted)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent
          dividers
          sx={{
            backgroundColor: "var(--background)",
            p: 2,
          }}
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <div
                  className="flex flex-col items-center justify-center p-1 border-2 border-dashed rounded-xl h-full"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Profile Picture
                  </p>

                  {currentImage ? (
                    <div className="relative group flex flex-col items-center">
                      <img
                        src={currentImage}
                        className="w-30 h-30 rounded-full object-cover shadow-md"
                        style={{ border: "4px solid var(--border)" }}
                        alt="Profile"
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="text"
                        sx={{
                          fontSize: "8px",
                          color: "#ef4444",
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                          },
                        }}
                        onClick={() => setValue("image", "")}
                      >
                        Remove Photo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageUploadWithCrop onImageCropped={handleImageDone} />
                    </div>
                  )}

                  <input type="hidden" {...register("image")} />
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-4">
                <TextField
                  {...register("fullName", { required: true })}
                  label="Full Name"
                  fullWidth
                  size="small"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    {...register("phone", { required: true })}
                    label="Phone Number"
                    size="small"
                    required
                  />
                  <TextField
                    {...register("role", { required: true })}
                    select
                    label="System Role"
                    size="small"
                    required
                    value={currentRole || "employee"}
                    onChange={(e) => setValue("role", e.target.value)}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                    <MenuItem value="accountant">Accountant</MenuItem>
                  </TextField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    {...register("nicNumber", { required: true })}
                    label="NIC Number"
                    size="small"
                    required
                  />
                  <TextField
                    {...register("gender", { required: true })}
                    select
                    label="Gender"
                    size="small"
                    required
                    value={currentGender || "male"}
                    onChange={(e) => setValue("gender", e.target.value)}
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                  </TextField>
                </div>
              </div>
            </div>

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  {...register("staffCategory", { required: true })}
                  select
                  label="Staff Category"
                  size="small"
                  required
                  value={staffCategory || "teacher"}
                  onChange={(e) => setValue("staffCategory", e.target.value)}
                >
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="other">Other Staff</MenuItem>
                </TextField>
                <TextField
                  {...register("designation", { required: true })}
                  label="Designation"
                  size="small"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                {...register("salary", { required: true })}
                label="Monthly Salary"
                type="number"
                size="small"
                required
              />
              <TextField
                {...register("experience", { required: true })}
                label="Experience (Years)"
                type="number"
                size="small"
                required
              />
            </div>

            <div
              className={`grid gap-4 ${staffCategory === "teacher" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
            >
              <TextField
                {...register("qualification", { required: true })}
                label="Qualification"
                size="small"
                required
              />

              {staffCategory === "teacher" && (
                <TextField
                  {...register("subject", { required: true })}
                  label="Subject"
                  size="small"
                  required
                />
              )}
            </div>

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  {...register("dateOfBirth", { required: true })}
                  label="Date of Birth"
                  type="date"
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  {...register("joiningDate", { required: true })}
                  label="Joining Date"
                  type="date"
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </div>
            </div>

            <div className="w-full">
              <TextField
                {...register("status", { required: true })}
                select
                label="Employment Status"
                fullWidth
                size="small"
                required
                value={currentStatus || "active"}
                onChange={(e) => setValue("status", e.target.value)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </div>

            {currentStatus === "inactive" && (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-md animate-in fade-in duration-300"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <TextField
                  {...register("inactiveDate", {
                    required: currentStatus === "inactive",
                  })}
                  label="Leaving Date"
                  type="date"
                  size="small"
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  {...register("inactiveReason", {
                    required: currentStatus === "inactive",
                  })}
                  label="Reason of Leaving"
                  placeholder="e.g. Resigned / Personal"
                  size="small"
                  required
                />
              </div>
            )}

            <TextField
              {...register("address", { required: true })}
              label="Complete Address"
              multiline
              rows={2}
              fullWidth
              size="small"
              required
            />

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-3"
                style={{ color: "var(--muted-foreground)" }}
              >
                Emergency Contact Information
              </p>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-dashed"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <TextField
                  {...register("emergencyContactName", { required: true })}
                  label="Name"
                  size="small"
                  required
                />
                <TextField
                  {...register("emergencyContactPhone", { required: true })}
                  label="Phone"
                  size="small"
                  required
                />
                <TextField
                  {...register("emergencyContactRelation", { required: true })}
                  label="Relation"
                  size="small"
                  required
                />
              </div>
            </div>
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
              "&:hover": {
                backgroundColor: "var(--muted)",
              },
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
              : employee
                ? "Update Details"
                : "Register"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
