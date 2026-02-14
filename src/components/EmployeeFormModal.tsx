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

  // Watch all required fields for controlled components
  const staffCategory = watch("staffCategory");
  const currentStatus = watch("status");
  const currentRole = watch("role");
  const currentGender = watch("gender");

  // 2. Image aur Gender ko watch karein
  // const currentGender = watch("gender");
  const currentImage = watch("image"); // Image field ko track karne ke liye

  // handleImageDone function jo Cropper se data lega
  const handleImageDone = (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setValue("image", base64String); // Form state mein image set karein
    };
  };
  useEffect(() => {
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
      reset({
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
      });
    }
  }, [employee, isOpen, reset]);

  const onFormSubmit = (data: any) => {
    if (data.staffCategory !== "teacher") {
      data.subject = "";
    }
    // Agar image select nahi ki gayi, to gender ke mutabiq default set karein
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
            {/* --- IMAGE UPLOAD SECTION --- */}
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Employee Profile Picture
              </p>

              {/* Agar image state mein hai, to sirf preview aur Remove button dikhao */}
              {currentImage ? (
                <div className="relative group flex flex-col items-center">
                  <img
                    src={currentImage}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                    alt="Profile"
                  />
                  <Button
                    type="button"
                    size="small"
                    variant="text"
                    className="mt-2 text-[10px] text-red-500 font-semibold hover:bg-red-50"
                    onClick={() => setValue("image", "")}
                  >
                    Remove Photo
                  </Button>
                </div>
              ) : (
                /* Agar image khali hai, to sirf Cropper (Add Photo box) dikhao. 
       Yahan humne placeholder wali logic bilkul nikal di hai. */
                <div className="flex flex-col items-center">
                  <ImageUploadWithCrop onImageCropped={handleImageDone} />
                </div>
              )}

              <input type="hidden" {...register("image")} />
            </div>

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
              {/* Qualification hamesha dikhegi */}
              <TextField
                {...register("qualification", { required: true })}
                label="Qualification"
                className={
                  staffCategory === "teacher" ? "w-full sm:w-1/2" : "w-full"
                }
                size="small"
                required
              />

              {/* Subject sirf Teacher ke liye dikhega */}
              {staffCategory === "teacher" && (
                <TextField
                  {...register("subject", { required: true })}
                  label="Subject"
                  className="w-full sm:w-1/2"
                  size="small"
                  required
                />
              )}
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
