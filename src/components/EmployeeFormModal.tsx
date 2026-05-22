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
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeValidationSchema } from "@/lib/validation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  employee?: IEmployee | null;
  isLoading?: boolean;
  schoolId: string | undefined;
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading,
  schoolId,
}: Props) {
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employeeValidationSchema),
    defaultValues: defaultValues,
    mode: "onTouched",
  });
  const staffCategory = watch("staffCategory");
  const currentStatus = watch("status");
  const currentRole = watch("role");
  const currentGender = watch("gender");
  const currentImage = watch("image") as string;

  const handleImageDone = useCallback(
    (base64: string) => {
      setValue("image", base64, { shouldDirty: true });
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

  useEffect(() => {
    if (!currentGender) return;
    if (!employee) return;

    const isAvatar =
      currentImage === "/male-avatar.jpg" ||
      currentImage === "/female-avatar.jpg" ||
      !currentImage;

    if (isAvatar) {
      setValue(
        "image",
        currentGender === "female" ? "/female-avatar.jpg" : "/male-avatar.jpg",
        { shouldDirty: true },
      );
    }
  }, [currentGender, setValue]);

  const onFormSubmit = useCallback(
    (data: any) => {
      const actualGender = currentGender || data.gender;
      if (data.staffCategory !== "teacher") {
        data.subject = "";
      }

      if (!data.image || data.image.trim() === "") {
        data.image =
          actualGender === "female" ? "/female-avatar.jpg" : "/male-avatar.jpg";
      }

      const formattedData = {
        ...data,
        salary: Number(data.salary),
        experience: Number(data.experience),
        schoolId: schoolId,
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
    [employee, onSubmit, reset, defaultValues, currentGender],
  );

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

                  {currentImage === "loading" ? (
                    // ✅ Uploading spinner
                    <div
                      className="w-30 h-30 rounded-full flex flex-col items-center justify-center"
                      style={{ border: "4px solid var(--border)" }}
                    >
                      <svg
                        className="animate-spin w-8 h-8 text-sky-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      <span className="text-[9px] mt-1 text-sky-500 font-medium">
                        Uploading...
                      </span>
                    </div>
                  ) : currentImage ? (
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
                      <ImageUploadWithCrop
                        onImageCropped={handleImageDone}
                        schoolId={schoolId || ""}
                        folder="employees"
                      />
                    </div>
                  )}

                  <input type="hidden" {...register("image")} />
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-4">
                <TextField
                  {...register("fullName")}
                  label="Full Name *"
                  fullWidth
                  size="small"
                  error={!!errors.fullName}
                  helperText={errors.fullName?.message as string}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    {...register("phone")}
                    label="Phone Number *"
                    size="small"
                    error={!!errors.phone}
                    helperText={errors.phone?.message as string}
                  />
                  <TextField
                    {...register("role")}
                    select
                    label="System Role"
                    size="small"
                    value={currentRole || "employee"}
                    onChange={(e) => setValue("role", e.target.value)}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <option value="helpdesk">Helpdesk Staff</option>
                    <option value="employee">Employee</option>
                    <option value="accountant">Accountant</option>
                  </TextField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    {...register("nicNumber")}
                    label="NIC Number"
                    size="small"
                  />
                  <TextField
                    {...register("gender")} // register ko spread karein
                    select
                    label="Gender"
                    size="small"
                    value={currentGender || "male"}
                    onChange={(e) => {
                      setValue("gender", e.target.value); // state update
                    }}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
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
                  {...register("staffCategory")}
                  select
                  label="Staff Category"
                  size="small"
                  value={staffCategory || "teacher"}
                  onChange={(e) => setValue("staffCategory", e.target.value)}
                  SelectProps={{ native: true }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="teacher">Teacher</option>
                  <option value="other">Other Staff</option>
                </TextField>
                <TextField
                  {...register("designation")}
                  label="Designation"
                  size="small"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                {...register("salary")}
                label="Monthly Salary"
                type="number"
                size="small"
              />
              <TextField
                {...register("experience")}
                label="Experience (Years)"
                type="number"
                size="small"
              />
            </div>

            <div
              className={`grid gap-4 ${staffCategory === "teacher" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
            >
              <TextField
                {...register("qualification")}
                label="Qualification"
                size="small"
              />

              {staffCategory === "teacher" && (
                <TextField
                  {...register("subject")}
                  label="Subject"
                  size="small"
                />
              )}
            </div>

            <div
              className="pt-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  {...register("dateOfBirth")}
                  label="Date of Birth"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  {...register("joiningDate")}
                  label="Joining Date"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </div>
            </div>

            <div className="w-full">
              <TextField
                {...register("status")}
                select
                label="Employment Status"
                fullWidth
                size="small"
                value={currentStatus || "active"}
                onChange={(e) => setValue("status", e.target.value)}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                  label="Leaving Date *"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.inactiveDate}
                  helperText={errors.inactiveDate?.message as string}
                />
                <TextField
                  {...register("inactiveReason", {
                    required: currentStatus === "inactive",
                  })}
                  label="Reason of Leaving *"
                  placeholder="e.g. Resigned / Personal"
                  size="small"
                  error={!!errors.inactiveReason}
                  helperText={errors.inactiveReason?.message as string}
                />
              </div>
            )}

            <TextField
              {...register("address")}
              label="Complete Address"
              multiline
              rows={2}
              fullWidth
              size="small"
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
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2 rounded-lg border border-dashed"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <TextField
                  {...register("emergencyContactName")}
                  label="Name"
                  size="small"
                />
                <TextField
                  {...register("emergencyContactPhone")}
                  label="Phone"
                  size="small"
                />

                <TextField
                  {...register("emergencyContactRelation")}
                  select
                  label="Relationship"
                  size="small"
                  SelectProps={{ native: true }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="brother">Brother</option>
                  <option value="sister">Sister</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                </TextField>
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
            disabled={isLoading || currentImage === "loading"}
            size="small"
            sx={{
              backgroundColor: "#1e293b",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "none",
              px: 1,
              py: 0.5,
            }}
          >
            {currentImage === "loading"
              ? "Wait for Image Uploading..."
              : isLoading
                ? "Processing..."
                : employee
                  ? "Update Details"
                  : "+ Register"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
