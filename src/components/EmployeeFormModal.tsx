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
import type { IEmployee } from "@/models/Employee";

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

  // Watch all required fields for controlled components
  const staffCategory = watch("staffCategory");
  const currentStatus = watch("status");
  const currentRole = watch("role");
  const currentGender = watch("gender");

  useEffect(() => {
    if (employee) {
      reset({
        ...employee,
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
      reset({
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
      });
    }
  }, [employee, isOpen, reset]);

  const onFormSubmit = (data: any) => {
    const formattedData = {
      ...data,
      // Numbers conversion to ensure DB storage
      salary: Number(data.salary),
      experience: Number(data.experience),
      // Emergency contact object mapping
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
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex justify-between items-center bg-slate-50 border-b">
        <span className="font-bold text-slate-700">
          {employee ? "Edit Employee Details" : "Register New Employee"}
        </span>
        <IconButton onClick={onClose} size="small" tabIndex={-1}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogContent dividers>
          <div className="flex flex-col gap-5">
            {/* 1. Basic Information */}
            <TextField
              {...register("fullName", { required: true })}
              label="Full Name"
              fullWidth
              size="small"
              required
            />

            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                {...register("phone", { required: true })}
                label="Phone Number"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
              <TextField
                {...register("role", { required: true })}
                select
                label="System Role"
                className="w-full sm:w-1/2"
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

            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                {...register("nicNumber", { required: true })}
                label="NIC Number"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
              <TextField
                {...register("gender", { required: true })}
                select
                label="Gender"
                className="w-full sm:w-1/2"
                size="small"
                required
                value={currentGender || "male"}
                onChange={(e) => setValue("gender", e.target.value)}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </div>

            {/* 2. Professional Details */}
            <div className="flex flex-col sm:flex-row gap-4 border-t pt-4">
              <TextField
                {...register("staffCategory", { required: true })}
                select
                label="Staff Category"
                className="w-full sm:w-1/2"
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
                className="w-full sm:w-1/2"
                size="small"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                {...register("salary", { required: true })}
                label="Monthly Salary"
                type="number"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
              <TextField
                {...register("experience", { required: true })}
                label="Experience (Years)"
                type="number"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <TextField
                {...register("subject")}
                label="Subject"
                disabled={staffCategory !== "teacher"}
                className="w-full sm:w-1/2"
                size="small"
                placeholder={
                  staffCategory === "teacher" ? "Maths, Urdu..." : "N/A"
                }
              />
              <TextField
                {...register("qualification", { required: true })}
                label="Qualification"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
            </div>

            {/* 3. Dates & Status */}
            <div className="flex flex-col sm:flex-row gap-4 border-t pt-4">
              <TextField
                {...register("dateOfBirth", { required: true })}
                label="Date of Birth"
                type="date"
                className="w-full sm:w-1/2"
                size="small"
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                {...register("joiningDate", { required: true })}
                label="Joining Date"
                type="date"
                className="w-full sm:w-1/2"
                size="small"
                required
              />
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

            {/* Conditional Inactive Fields */}
            {currentStatus === "inactive" && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-red-50 border border-red-200 rounded-md animate-in fade-in duration-300">
                <TextField
                  {...register("inactiveDate", {
                    required: currentStatus === "inactive",
                  })}
                  label="Leaving Date"
                  type="date"
                  className="w-full sm:w-1/2"
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
                  className="w-full sm:w-1/2"
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

            {/* 4. Emergency Contact */}
            <div className="mt-2 border-t pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Emergency Contact Information
              </p>
              <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded border border-dashed border-slate-300">
                <TextField
                  {...register("emergencyContactName", { required: true })}
                  label="Name"
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  {...register("emergencyContactPhone", { required: true })}
                  label="Phone"
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  {...register("emergencyContactRelation", { required: true })}
                  label="Relation"
                  fullWidth
                  size="small"
                  required
                />
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions className="p-4 bg-slate-50 border-t">
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
              backgroundColor: "#1e293b",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "none",
              px: 4,
            }}
          >
            {isLoading
              ? "Processing..."
              : employee
                ? "Update Details"
                : "Register Employee"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
