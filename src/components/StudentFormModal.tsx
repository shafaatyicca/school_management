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
import { Close as CloseIcon } from "@mui/icons-material";
import { Autocomplete, Box, createFilterOptions } from "@mui/material";

const filter = createFilterOptions();

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

  const currentStatus = watch("status");
  const studentGender = watch("gender");
  const selectedClassId = watch("classId");
  const selectedSection = watch("section");
  const parentIdValue = watch("parentId") || "";
  const fatherGender = watch("parentData.gender") || "Male";

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
          inactiveReason: student.inactiveReason || "",
          motherName: student.motherName || "",
          motherProfession: student.motherProfession || "",
          motherPhone: student.motherPhone || "",
          guardianName: student.guardianName || "",
          guardianRelation: student.guardianRelation || "",
          guardianPhone: student.guardianPhone || "",
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
    if (selectedClassId) {
      const cls = classes.find((c: any) => c._id === selectedClassId);
      setAvailableSections(cls?.sections || []);
    }
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (currentStatus === "active") {
      setValue("inactiveDate", "");
      setValue("inactiveReason", "");
    }
  }, [currentStatus, setValue]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Transition}
    >
      <DialogTitle className="flex justify-between items-center border-b bg-background px-6">
        <span className="font-bold text-[11px] uppercase tracking-[0.15em]">
          {student ? `Edit: ${student.fullName}` : "Student Admission Form"}
        </span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon style={{ fontSize: "16px" }} />
        </IconButton>
      </DialogTitle>
      <Divider />

      <form
        onSubmit={handleSubmit((data) =>
          onSubmit({ ...data, isNewParent: student ? false : isNewParent }),
        )}
      >
        <DialogContent className="space-y-6">
          <div className="space-y-6">
            <Typography className="font-bold text-blue-600 text-sm uppercase pb-4">
              1. Personal Details
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="Full Name *"
                  {...register("fullName")}
                  size="small"
                />
              </div>

              <div className="md:col-span-3">
                <TextField
                  select
                  fullWidth
                  label="Gender *"
                  value={studentGender || "Male"} // Upar wala variable yahan use hoga
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
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Cast"
                  {...register("cast")}
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Religion"
                  {...register("religion")}
                  size="small"
                />
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  label="Nationality"
                  {...register("nationality")}
                  size="small"
                />
              </div>
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="Place of Birth"
                  {...register("placeOfBirth")}
                  size="small"
                />
              </div>
              <div className="md:col-span-6">
                <TextField
                  fullWidth
                  label="B-Form / CNIC"
                  {...register("bFormNumber")}
                  size="small"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Typography className="font-bold text-emerald-600 text-sm uppercase pb-4">
              2. Academic Details
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <TextField
                  select
                  fullWidth
                  label="Class *"
                  value={selectedClassId || ""}
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
                    availableSections.includes(selectedSection)
                      ? selectedSection
                      : ""
                  }
                  onChange={(e) => setValue("section", e.target.value)}
                  size="small"
                >
                  {availableSections.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="md:col-span-4">
                <TextField
                  fullWidth
                  type="date"
                  label="Enrollment Date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register("enrollmentDate")}
                  size="small"
                />
              </div>
              <div className="md:col-span-12">
                <TextField
                  fullWidth
                  label="Previous School"
                  {...register("previousSchool")}
                  size="small"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Typography className="font-bold text-amber-600 text-sm uppercase pb-4">
              3. Parent Details
            </Typography>
            <Autocomplete
              value={parents.find((p: any) => p._id === parentIdValue) || null}
              onChange={(event, newValue: any) => {
                if (newValue && newValue.inputValue) {
                  // "+ Add New Parent" logic
                  setIsNewParent(true);
                  setValue("parentId", "");
                  setValue("parentData.fullName", newValue.inputValue);
                } else if (newValue) {
                  // Existing Parent logic
                  setIsNewParent(false);
                  setValue("parentId", newValue._id);
                  setValue("parentData", {
                    fullName: "",
                    cnic: "",
                    phone: "",
                    address: "",
                    gender: "Male",
                    occupation: "",
                  });
                } else {
                  setIsNewParent(false);
                  setValue("parentId", "");
                }
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                const { inputValue } = params;

                if (inputValue !== "") {
                  filtered.push({
                    inputValue,
                    fullName: `+ Add "${inputValue}" as New Parent`,
                  });
                }
                return filtered;
              }}
              options={parents}
              getOptionLabel={(option: any) => {
                if (typeof option === "string") return option;
                if (option.inputValue) return option.inputValue;
                return `${option.fullName} (${option.cnic || "No CNIC"})`;
              }}
              renderOption={(props, option: any, { index }) => {
                const { key, ...optionProps } = props as any;
                const isAddNew = !!option.inputValue;

                return (
                  <li
                    key={key}
                    {...optionProps}
                    className={`${optionProps.className} border-b last:border-0 py-2`}
                  >
                    <Box className="flex items-center gap-3 w-full">
                      {!isAddNew && (
                        <Typography
                          variant="caption"
                          className="bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold min-w-[25px] text-center"
                        >
                          {index + 1}
                        </Typography>
                      )}

                      <Box className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
                        {/* Name Section */}
                        <Typography
                          variant="body2"
                          className={
                            isAddNew
                              ? "text-blue-600 font-bold"
                              : "font-semibold min-w-[150px]"
                          }
                        >
                          {option.fullName}
                        </Typography>

                        {/* CNIC & Phone Section (Sirf purane parents ke liye) */}
                        {!isAddNew && (
                          <Box className="flex gap-4 items-center">
                            <Typography
                              variant="caption"
                              className="bg-blue-50 text-blue-700 px-2 rounded border border-blue-100"
                            >
                              <strong>CNIC:</strong> {option.cnic || "N/A"}
                            </Typography>
                            <Typography
                              variant="caption"
                              className="bg-green-50 text-green-700 px-2 rounded border border-green-100"
                            >
                              <strong>Phone:</strong> {option.phone || "N/A"}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Father or Type New Name"
                  size="small"
                  fullWidth
                  helperText="Type to search, or type a new name to add a new record"
                />
              )}
            />

            {/* Agar New Parent select ho to niche fields khul jayen */}
            {isNewParent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-orange-50/30 rounded-xl border animate-in fade-in duration-500">
                <TextField
                  fullWidth
                  label="Father Name"
                  {...register("parentData.fullName")}
                  size="small"
                />
                <TextField
                  select
                  fullWidth
                  label="Gender"
                  value={fatherGender}
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
                  label="CNIC"
                  {...register("parentData.cnic")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Phone"
                  {...register("parentData.phone")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Occupation (Peshah)"
                  {...register("parentData.occupation")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Address"
                  {...register("parentData.address")}
                  size="small"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Typography className="font-bold text-pink-600 text-sm uppercase pb-2">
              4. Mother's Information
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                fullWidth
                label="Mother Name"
                {...register("motherName")}
                size="small"
              />
              <TextField
                fullWidth
                label="Mother Profession"
                {...register("motherProfession")}
                size="small"
              />
              <TextField
                fullWidth
                label="Mother Phone"
                {...register("motherPhone")}
                size="small"
              />
            </div>
          </div>

          <div className="space-y-6">
            <Typography className="font-bold text-purple-600 text-sm uppercase pb-2">
              5. Guardian's Information
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                fullWidth
                label="Guardian Name"
                {...register("guardianName")}
                size="small"
              />
              <TextField
                fullWidth
                label="Relation with Student"
                {...register("guardianRelation")}
                size="small"
              />
              <TextField
                fullWidth
                label="Guardian Phone"
                {...register("guardianPhone")}
                size="small"
              />
            </div>
          </div>

          <div className="space-y-6">
            <Typography className="font-bold text-slate-600 text-sm uppercase pb-4">
              6. Status & Notes
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <TextField
                  select
                  fullWidth
                  label="Current Status"
                  value={currentStatus || "active"}
                  onChange={(e) => setValue("status", e.target.value)}
                  size="small"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </div>
              {currentStatus === "inactive" && (
                <>
                  <div className="md:col-span-4">
                    <TextField
                      fullWidth
                      type="date"
                      label="Inactive Date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      {...register("inactiveDate")}
                      size="small"
                      required
                    />
                  </div>
                  <div className="md:col-span-4">
                    <TextField
                      fullWidth
                      label="Reason for Inactive"
                      {...register("inactiveReason")}
                      size="small"
                      required
                      placeholder="e.g. SLC Issued"
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-12">
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Remarks"
                  {...register("detailedNote")}
                  size="small"
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <Divider />
        <DialogActions className="px-6 py-2 gap-3">
          <Button onClick={onClose} className="text-[10px] tracking-widest">
            CANCEL
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            className="bg-primary text-primary-foreground px-6 text-[10px] tracking-widest"
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
