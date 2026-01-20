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
} from "lucide-react";
import type { ITeacher } from "@/models/Teacher";

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  teacher?: ITeacher | null;
  isLoading: boolean;
}

export default function TeacherFormModal({
  isOpen,
  onClose,
  onSubmit,
  teacher,
  isLoading,
}: TeacherFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedStatus = watch("status");

  useEffect(() => {
    if (teacher) {
      reset({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        dateOfBirth: new Date(teacher.dateOfBirth).toISOString().split("T")[0],
        qualification: teacher.qualification,
        experience: teacher.experience,
        subject: teacher.subject,
        address: teacher.address,
        salary: teacher.salary,
        joiningDate: new Date(teacher.joiningDate).toISOString().split("T")[0],
        status: teacher.status,
        emergencyContactName: teacher.emergencyContact.name,
        emergencyContactPhone: teacher.emergencyContact.phone,
        emergencyContactRelation: teacher.emergencyContact.relation,
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
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
  }, [teacher, reset]);

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
            {teacher ? "Edit Teacher Profile" : "Add Teacher"}
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
                {/* Row 1: Qualification & Subject */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Qualification *</Label>
                  <Input
                    {...register("qualification", { required: "Required" })}
                    className="h-10 text-sm"
                    placeholder="e.g. M.Sc Math"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Subject *</Label>
                  <Input
                    {...register("subject", { required: "Required" })}
                    className="h-10 text-sm"
                    placeholder="Mathematics"
                  />
                </div>

                {/* Row 2: Experience & Salary (Now in 2 columns instead of 4) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Experience (Years) *
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      type="number"
                      {...register("experience", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Salary (PKR) *</Label>
                  <div className="relative">
                    <Wallet className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      type="number"
                      {...register("salary", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="50000"
                    />
                  </div>
                </div>

                {/* Row 3: Joining Date & Status (Now in 2 columns instead of 4) */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Joining Date *</Label>
                  <Input
                    type="date"
                    {...register("joiningDate", { required: "Required" })}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Status *</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(v) => setValue("status", v)}
                  >
                    <SelectTrigger className="h-10 text-sm">
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
              className="h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="size-3.5" />
                  {teacher ? "Update Teacher" : "Save Teacher"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
