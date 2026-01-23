"use client";
import React, { useEffect, useState, useMemo, forwardRef } from "react";
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
  Typography,
  Divider,
  Slide,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

const Transition = forwardRef(function Transition(props: any, ref: any) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
  const [parentSearch, setParentSearch] = useState("");

  const formValues = watch();

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
          gender: "Male",
          cast: "",
          religion: "Islam",
          nationality: "Pakistani",
          status: "active",
          enrollmentDate: new Date().toISOString().split("T")[0],
          parentData: {
            fullName: "",
            cnic: "",
            phone: "",
            address: "",
            gender: "Male",
          },
          parentId: "",
        });
        setIsNewParent(false);
      }
    }
  }, [isOpen, student, reset]);

  useEffect(() => {
    if (formValues.classId) {
      const cls = classes.find((c: any) => c._id === formValues.classId);
      setAvailableSections(cls?.sections || []);
    }
  }, [formValues.classId, classes]);

  const filteredParents = useMemo(() => {
    const search = parentSearch || "";
    return parents.filter(
      (p: any) =>
        p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        p.cnic?.includes(search),
    );
  }, [parents, parentSearch]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Transition}
      disableEnforceFocus={true}
      disableRestoreFocus={true}
      aria-hidden={!isOpen}
    >
      <DialogTitle className="flex justify-between items-center bg-white py-2">
        <span className="font-bold text-[#2d3748] text-sm uppercase tracking-tight">
          {student
            ? `Edit Student: ${student.fullName}`
            : "Student Admission Form"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <form
        onSubmit={handleSubmit((data) =>
          onSubmit({ ...data, isNewParent: student ? false : isNewParent }),
        )}
      >
        <DialogContent className="space-y-6">
          {/* 1. PERSONAL DETAILS */}
          <div className="space-y-6">
            <Typography className="font-bold text-blue-600 text-sm uppercase tracking-wider pb-2">
              1. Personal Details
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="Full Name *"
                  {...register("fullName")}
                  value={formValues.fullName || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-3">
                <TextField
                  select
                  fullWidth
                  label="Gender *"
                  value={formValues.gender || "Male"}
                  onChange={(e) => setValue("gender", e.target.value)}
                  size="small"
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </TextField>
              </div>
              <div className="md:col-span-3">
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth *"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register("dateOfBirth")}
                  value={formValues.dateOfBirth || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Cast"
                  {...register("cast")}
                  value={formValues.cast || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Religion"
                  {...register("religion")}
                  value={formValues.religion || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Nationality"
                  {...register("nationality")}
                  value={formValues.nationality || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="Place of Birth"
                  {...register("placeOfBirth")}
                  value={formValues.placeOfBirth || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="B-Form / CNIC Number"
                  {...register("bFormNumber")}
                  value={formValues.bFormNumber || ""}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* 2. ACADEMIC DETAILS */}
          <div className="space-y-6">
            <Typography className="font-bold text-emerald-600 text-sm uppercase tracking-wider pb-2">
              2. Academic Details
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <TextField
                  select
                  fullWidth
                  label="Class *"
                  value={formValues.classId || ""}
                  onChange={(e) => setValue("classId", e.target.value)}
                  size="small"
                >
                  {classes.map((c: any) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="md:col-span-4">
                <TextField
                  select
                  fullWidth
                  label="Section *"
                  value={
                    availableSections.includes(formValues.section)
                      ? formValues.section
                      : ""
                  }
                  onChange={(e) => setValue("section", e.target.value)}
                  size="small"
                >
                  {/* Agar list khali hai (starting mein), to temporary purana section dikha do */}
                  {availableSections.length > 0
                    ? availableSections.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))
                    : // Yeh line error ko khatam kar degi jab tak list load ho rahi ho
                      formValues.section && (
                        <MenuItem value={formValues.section}>
                          {formValues.section}
                        </MenuItem>
                      )}
                </TextField>
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  type="date"
                  label="Enrollment Date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register("enrollmentDate")}
                  value={formValues.enrollmentDate || ""}
                  size="small"
                />
              </div>
              <div className="md:col-span-12">
                <TextField
                  fullWidth
                  label="Previous School Name"
                  {...register("previousSchool")}
                  value={formValues.previousSchool || ""}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* 3. PARENT & GUARDIAN DETAILS */}
          <div className="space-y-1">
            <div className="flex justify-between items-center pb-2">
              <Typography className="font-bold text-amber-600 text-sm uppercase tracking-wider">
                3. Parent & Guardian Details
              </Typography>
              {/* Button sirf Add mode mein nazar ayega */}
              {!student && (
                <Button
                  size="small"
                  onClick={() => setIsNewParent(!isNewParent)}
                  className="text-[11px] capitalize font-bold underline"
                >
                  {isNewParent ? "Back to Search" : "+ Add New Parent Profile"}
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {!student ? (
                <>
                  {!isNewParent ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        fullWidth
                        placeholder="Search Father by Name or CNIC..."
                        size="small"
                        value={parentSearch || ""}
                        onChange={(e) => setParentSearch(e.target.value)}
                        className="bg-white"
                        InputProps={{
                          startAdornment: (
                            <SearchIcon
                              className="mr-2 text-slate-400"
                              fontSize="small"
                            />
                          ),
                        }}
                      />
                      <TextField
                        select
                        fullWidth
                        label="Select Registered Father"
                        value={formValues.parentId || ""}
                        onChange={(e) => setValue("parentId", e.target.value)}
                        size="small"
                        className="bg-white"
                      >
                        {filteredParents.map((p: any) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.fullName} - {p.cnic}
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 p-5 bg-orange-50/30 rounded-xl border border-orange-100">
                      <TextField
                        fullWidth
                        label="Father Name *"
                        {...register("parentData.fullName")}
                        value={formValues.parentData?.fullName || ""}
                        size="small"
                      />
                      <TextField
                        select
                        fullWidth
                        label="Father Gender *"
                        value={formValues.parentData?.gender || "Male"}
                        onChange={(e) =>
                          setValue("parentData.gender", e.target.value)
                        }
                        size="small"
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        label="Father CNIC *"
                        {...register("parentData.cnic")}
                        value={formValues.parentData?.cnic || ""}
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="Father Phone *"
                        {...register("parentData.phone")}
                        value={formValues.parentData?.phone || ""}
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="Complete Address"
                        {...register("parentData.address")}
                        value={formValues.parentData?.address || ""}
                        size="small"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Edit Mode mein sirf aik hint dikhayen */
                <div className="p-2 bg-blue-50/30 border border-blue-100 rounded-lg">
                  <Typography className="text-sm text-blue-500">
                    Parent (Father) profile is linked. To update parent info,
                    please visit the <strong>Parent Management</strong>.
                  </Typography>
                </div>
              )}

              {/* Mother & Guardian fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <TextField
                  fullWidth
                  label="Mother Name"
                  {...register("motherName")}
                  value={formValues.motherName || ""}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Mother Phone"
                  {...register("motherPhone")}
                  value={formValues.motherPhone || ""}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Mother Profession"
                  {...register("motherProfession")}
                  value={formValues.motherProfession || ""}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Guardian Name"
                  {...register("guardianName")}
                  value={formValues.guardianName || ""}
                  size="small"
                />
                <TextField
                  select
                  fullWidth
                  label="Relation"
                  value={formValues.guardianRelation || ""}
                  onChange={(e) => setValue("guardianRelation", e.target.value)}
                  size="small"
                >
                  <MenuItem value="Father">Father</MenuItem>
                  <MenuItem value="Mother">Mother</MenuItem>
                  <MenuItem value="Uncle">Uncle</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  label="Guardian Phone"
                  {...register("guardianPhone")}
                  value={formValues.guardianPhone || ""}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* 4. STATUS & NOTES */}
          <div className="space-y-6">
            <Typography className="font-bold text-slate-600 text-sm uppercase tracking-wider pb-2">
              4. Status & Notes
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <TextField
                  select
                  fullWidth
                  label="Current Status"
                  value={formValues.status || "active"}
                  onChange={(e) => setValue("status", e.target.value)}
                  size="small"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </div>
              {formValues.status === "inactive" && (
                <div className="md:col-span-4">
                  <TextField
                    fullWidth
                    type="date"
                    label="Inactive Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...register("inactiveDate")}
                    value={formValues.inactiveDate || ""}
                    size="small"
                  />
                </div>
              )}
              <div className="md:col-span-12">
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Additional Remarks / Notes"
                  {...register("detailedNote")}
                  value={formValues.detailedNote || ""}
                  size="small"
                />
              </div>
            </div>
          </div>
        </DialogContent>

        <Divider />
        <DialogActions className="p-6 bg-slate-50 gap-4">
          <Button onClick={onClose} className="text-slate-500 font-bold px-6">
            CANCEL
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            className="bg-[#2563eb] px-10 py-2 font-bold hover:bg-blue-700 shadow-lg"
          >
            {isLoading
              ? "PROCESSING..."
              : student
                ? "UPDATE STUDENT"
                : "CONFIRM ADMISSION"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
