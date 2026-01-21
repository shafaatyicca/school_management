"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  BookOpen,
  Clock,
  Wallet,
  Save,
  ShieldAlert,
  Briefcase,
  CreditCard,
  UserCircle,
} from "lucide-react";
import type { IEmployee } from "@/models/Employee";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  employee?: IEmployee | null;
  isLoading: boolean;
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading,
}: EmployeeFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedStatus = watch("status");
  const selectedGender = watch("gender");
  const selectedStaffCategory = watch("staffCategory");

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        dateOfBirth: new Date(employee.dateOfBirth).toISOString().split("T")[0],
        gender: employee.gender,
        nicNumber: employee.nicNumber,
        staffCategory: employee.staffCategory,
        qualification: employee.qualification,
        experience: employee.experience,
        subject: employee.subject || "",
        address: employee.address,
        salary: employee.salary,
        joiningDate: new Date(employee.joiningDate).toISOString().split("T")[0],
        status: employee.status,
        emergencyContactName: employee.emergencyContact.name,
        emergencyContactPhone: employee.emergencyContact.phone,
        emergencyContactRelation: employee.emergencyContact.relation,
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        nicNumber: "",
        staffCategory: "",
        qualification: "",
        experience: 0,
        subject: "",
        address: "",
        salary: 0,
        joiningDate: new Date().toISOString().split("T")[0],
        status: "active",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: "",
      });
    }
  }, [employee, reset]);

  const onFormSubmit = (data: any) => {
    const formattedData = {
      ...data,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[95vh] flex flex-col bg-white dark:bg-zinc-950">
        {/* Compact Header */}
        <DialogHeader className="p-2 bg-slate-900 text-white shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <User className="size-5 text-blue-400" />
            {employee ? "Edit Employee Profile" : "Add Employee"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col overflow-hidden"
        >
          <div className="p-3 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <User className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Personal Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">First Name *</Label>
                  <Input
                    {...register("firstName", { required: "Required" })}
                    className="h-9 text-sm"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-[10px] text-red-500">
                      {errors.firstName.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Last Name *</Label>
                  <Input
                    {...register("lastName", { required: "Required" })}
                    className="h-9 text-sm"
                    placeholder="Doe"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      type="email"
                      {...register("email", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="john@school.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      {...register("phone", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="+92..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Date of Birth *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      type="date"
                      {...register("dateOfBirth", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Gender *</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-2.5 top-2.5 size-4 text-slate-400 z-10" />
                    <Select
                      value={selectedGender}
                      onValueChange={(v) => setValue("gender", v)}
                    >
                      <SelectTrigger className="h-9 text-sm pl-9">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">NIC Number *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      {...register("nicNumber", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="12345-1234567-1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      {...register("address", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Professional Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <GraduationCap className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Professional Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Category */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Staff Category *
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-2.5 top-2.5 size-4 text-slate-400 z-10" />
                    <Select
                      value={selectedStaffCategory}
                      onValueChange={(v) => setValue("staffCategory", v)}
                    >
                      <SelectTrigger className="h-9 text-sm pl-9">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="other">Other Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Qualification *</Label>
                  <Input
                    {...register("qualification", { required: "Required" })}
                    className="h-9 text-sm"
                    placeholder="e.g. M.Sc Math"
                  />
                </div>

                {/* Subject - Only show if teacher */}
                {selectedStaffCategory === "teacher" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Subject</Label>
                    <Input
                      {...register("subject")}
                      className="h-9 text-sm"
                      placeholder="Mathematics"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Experience (Years) *
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      type="number"
                      {...register("experience", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Salary (PKR) *</Label>
                  <div className="relative">
                    <Wallet className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                    <Input
                      type="number"
                      {...register("salary", { required: "Required" })}
                      className="pl-9 h-9 text-sm"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Joining Date *</Label>
                  <Input
                    type="date"
                    {...register("joiningDate", { required: "Required" })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Status *</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(v) => setValue("status", v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Emergency Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <ShieldAlert className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Emergency Contact
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Contact Name *
                  </Label>
                  <Input
                    {...register("emergencyContactName", {
                      required: "Required",
                    })}
                    className="h-9 text-sm bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Contact Phone *
                  </Label>
                  <Input
                    {...register("emergencyContactPhone", {
                      required: "Required",
                    })}
                    className="h-9 text-sm bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Relation *
                  </Label>
                  <Input
                    {...register("emergencyContactRelation", {
                      required: "Required",
                    })}
                    className="h-9 text-sm bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-2 bg-slate-50 dark:bg-zinc-900 border-t flex justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="size-3.5" />
                  {employee ? "Update" : "Save"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
