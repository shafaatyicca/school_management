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
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

export default function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  student,
  classes,
  isLoading,
}: any) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const [parents, setParents] = useState([]);
  const [isNewParent, setIsNewParent] = useState(false);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const selectedClass = watch("classId");
  const selectedStatus = watch("status");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/parents")
        .then((res) => res.json())
        .then((data) => setParents(data));

      if (student) {
        reset({
          ...student,
          dateOfBirth: student.dateOfBirth
            ? new Date(student.dateOfBirth).toISOString().split("T")[0]
            : "",
          enrollmentDate: student.enrollmentDate
            ? new Date(student.enrollmentDate).toISOString().split("T")[0]
            : "",
          inactiveDate: student.inactiveDate
            ? new Date(student.inactiveDate).toISOString().split("T")[0]
            : "",
          classId: student.classId?._id || student.classId,
          parentId: student.parentId?._id || student.parentId,
        });
      } else {
        reset({
          fullName: "",
          gender: "",
          cast: "",
          religion: "Islam",
          nationality: "Pakistani",
          placeOfBirth: "",
          bFormNumber: "",
          classId: "",
          section: "",
          previousSchool: "",
          status: "active",
          enrollmentDate: new Date().toISOString().split("T")[0],
          parentData: { gender: "Male" },
        });
      }
      setIsNewParent(false);
    }
  }, [isOpen, student, reset]);

  useEffect(() => {
    if (selectedClass) {
      const cls = classes.find((c: any) => c._id === selectedClass);
      setAvailableSections(cls?.sections || []);
    }
  }, [selectedClass, classes]);

  const relationOptions = [
    { label: "Father", value: "Father" },
    { label: "Mother", value: "Mother" },
    { label: "Brother", value: "Brother" },
    { label: "Sister", value: "Sister" },
    { label: "Uncle", value: "Uncle" },
    { label: "Aunt", value: "Aunt" },
    { label: "Grandfather", value: "Grandfather" },
    { label: "Grandmother", value: "Grandmother" },
    { label: "Other", value: "Other" },
  ];
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden p-0 flex flex-col bg-white border-none shadow-2xl">
        {/* SMALL HEADER */}
        <DialogHeader className="px-6 py-3 border-b bg-slate-50 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {student
              ? `Edit Student: GR# ${student.grNumber}`
              : "Student Admission Form"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => onSubmit({ ...data, isNewParent }))}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            {/* STUDENT SECTION */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 border-b pb-2">
                1. Student Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <Label>Full Name*</Label>
                  <Input {...register("fullName", { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Gender*</Label>
                  <Select
                    onValueChange={(v) => setValue("gender", v)}
                    value={watch("gender")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth*</Label>
                  <Input
                    type="date"
                    {...register("dateOfBirth", { required: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cast</Label>
                  <Input {...register("cast")} />
                </div>
                <div className="space-y-1">
                  <Label>Religion</Label>
                  <Input {...register("religion")} />
                </div>
                <div className="space-y-1">
                  <Label>Nationality</Label>
                  <Input {...register("nationality")} />
                </div>
                <div className="space-y-1">
                  <Label>Place of Birth</Label>
                  <Input {...register("placeOfBirth")} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>B-Form / CNIC Number</Label>
                  <Input {...register("bFormNumber")} />
                </div>
              </div>
            </div>

            {/* ACADEMIC SECTION */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 border-b pb-2">
                2. Academic Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label>Class*</Label>
                  <Select
                    onValueChange={(v) => setValue("classId", v)}
                    value={watch("classId")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Section*</Label>
                  <Select
                    onValueChange={(v) => setValue("section", v)}
                    value={watch("section")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Enrollment Date</Label>
                  <Input type="date" {...register("enrollmentDate")} />
                </div>
                <div className="space-y-1">
                  <Label>Previous School</Label>
                  <Input {...register("previousSchool")} />
                </div>
              </div>
            </div>

            {/* PARENT SECTION */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">
                  3. Parent/Guardian
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewParent(!isNewParent)}
                >
                  {isNewParent ? "Select Existing" : "Add New Parent"}
                </Button>
              </div>

              <div className="p-6 bg-slate-50 rounded-lg border">
                {!isNewParent ? (
                  <div className="space-y-1">
                    <Label>Registered Father</Label>
                    <Select
                      onValueChange={(v) => setValue("parentId", v)}
                      value={watch("parentId")}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Search Father" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((p: any) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.fullName} - {p.cnic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label>Father Name*</Label>
                      <Input
                        {...register("parentData.fullName")}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Father Gender*</Label>
                      <Select
                        onValueChange={(v) => setValue("parentData.gender", v)}
                        defaultValue="Male"
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Father CNIC*</Label>
                      <Input
                        {...register("parentData.cnic")}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Father Phone</Label>
                      <Input
                        {...register("parentData.phone")}
                        className="bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label>Address</Label>
                      <Input
                        {...register("parentData.address")}
                        className="bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-1">
                  <Label>Mother Name</Label>
                  <Input {...register("motherName")} />
                </div>
                <div className="space-y-1">
                  <Label>Mother Phone</Label>
                  <Input {...register("motherPhone")} />
                </div>
                <div className="space-y-1">
                  <Label>Mother Profession</Label>
                  <Input {...register("motherProfession")} />
                </div>
                <div className="space-y-1">
                  <Label>Guardian Name</Label>
                  <Input {...register("guardianName")} />
                </div>
                {/* Guardian Relation Dropdown */}
                <div className="space-y-1">
                  <Label>Guardian Relation</Label>
                  <select
                    {...register("guardianRelation")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Guardian Phone</Label>
                  <Input {...register("guardianPhone")} />
                </div>
              </div>
            </div>

            {/* STATUS & NOTES */}
            <div className="space-y-4 border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(v) => setValue("status", v)}
                    value={watch("status")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedStatus === "inactive" && (
                  <div className="space-y-1">
                    <Label>Inactive Date</Label>
                    <Input type="date" {...register("inactiveDate")} />
                  </div>
                )}
                {selectedStatus === "inactive" && (
                  <div className="md:col-span-2 space-y-1">
                    <Label>Reason</Label>
                    <Input {...register("inactiveReason")} />
                  </div>
                )}
                <div className="md:col-span-2 space-y-1">
                  <Label>Detailed Note</Label>
                  <Textarea {...register("detailedNote")} rows={3} />
                </div>
              </div>
            </div>
          </div>

          {/* SMALL FOOTER */}
          <div className="px-6 py-3 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 px-8 font-bold"
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={16} /> Save Record
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
