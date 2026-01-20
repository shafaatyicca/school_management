"use client";

import { useEffect, useState } from "react";
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
  School,
  Hash,
  Droplets,
  Baby,
  Users,
  Save,
  HeartPulse,
} from "lucide-react";
import type { IStudent } from "@/models/Student";

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  student?: IStudent | null;
  classes: any[];
  isLoading: boolean;
}

export default function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  student,
  classes,
  isLoading,
}: StudentFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedClass = watch("classId");
  const selectedSection = watch("section");
  const selectedStatus = watch("status");

  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Update available sections when class changes
  useEffect(() => {
    if (selectedClass) {
      const classData = classes.find((c) => c._id === selectedClass);
      setAvailableSections(classData?.sections || []);
    } else {
      setAvailableSections([]);
    }
  }, [selectedClass, classes]);

  useEffect(() => {
    if (student) {
      const classId =
        typeof student.classId === "object" && student.classId !== null
          ? (student.classId as any)._id
          : student.classId;

      reset({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        dateOfBirth: new Date(student.dateOfBirth).toISOString().split("T")[0],
        classId: classId,
        section: student.section,
        rollNumber: student.rollNumber,
        address: student.address,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianRelation: student.guardianRelation,
        enrollmentDate: new Date(student.enrollmentDate)
          .toISOString()
          .split("T")[0],
        status: student.status,
        bloodGroup: student.bloodGroup || "",
        previousSchool: student.previousSchool || "",
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        classId: "",
        section: "",
        rollNumber: "",
        address: "",
        guardianName: "",
        guardianPhone: "",
        guardianRelation: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "active",
        bloodGroup: "",
        previousSchool: "",
      });
    }
  }, [student, reset, classes]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[95vh] flex flex-col bg-white dark:bg-zinc-950">
        {/* Compact Header */}
        <DialogHeader className="p-2 bg-slate-900 text-white shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Baby className="size-5 text-blue-400" />
            {student ? "Edit Student Profile" : "Register New Student"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col overflow-hidden"
        >
          <div className="p-3 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <User className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">First Name *</Label>
                  <Input
                    {...register("firstName", { required: "Required" })}
                    className="h-10 text-sm"
                    placeholder="Ahmed"
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
                    className="h-10 text-sm"
                    placeholder="Khan"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      type="email"
                      {...register("email", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="ahmed@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      {...register("phone", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="+92..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Date of Birth *
                    </Label>
                    <Input
                      type="date"
                      {...register("dateOfBirth", { required: "Required" })}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Blood Group</Label>
                    <div className="relative">
                      <Droplets className="absolute left-2.5 top-3 size-4 text-red-400" />
                      <Input
                        {...register("bloodGroup")}
                        className="pl-9 h-10 text-sm"
                        placeholder="O+"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Home Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      {...register("address", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="Street, City"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Academic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <School className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Academic Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Class *</Label>
                    <Select
                      value={selectedClass}
                      onValueChange={(v) => {
                        setValue("classId", v);
                        setValue("section", "");
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Section *</Label>
                    <Select
                      value={selectedSection}
                      onValueChange={(v) => setValue("section", v)}
                      disabled={
                        !selectedClass || availableSections.length === 0
                      }
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Roll Number *</Label>
                  <div className="relative">
                    <Hash className="absolute left-2.5 top-3 size-4 text-slate-400" />
                    <Input
                      {...register("rollNumber", { required: "Required" })}
                      className="pl-9 h-10 text-sm"
                      placeholder="001"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Enrollment Date *
                  </Label>
                  <Input
                    type="date"
                    {...register("enrollmentDate", { required: "Required" })}
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

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs font-medium">Previous School</Label>
                  <Input
                    {...register("previousSchool")}
                    className="h-10 text-sm"
                    placeholder="Name of last school attended"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Guardian Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-1">
                <Users className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Guardian Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Guardian Name *
                  </Label>
                  <Input
                    {...register("guardianName", { required: "Required" })}
                    className="h-10 text-sm bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Guardian Phone *
                  </Label>
                  <Input
                    {...register("guardianPhone", { required: "Required" })}
                    className="h-10 text-sm bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">
                    Relation *
                  </Label>
                  <Input
                    {...register("guardianRelation", { required: "Required" })}
                    className="h-10 text-sm bg-slate-50"
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
              className="h-8 px-3 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="size-4" />
                  {student ? "Update Student" : "Save Student"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
