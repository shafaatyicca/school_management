"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useCallback,
} from "react";
import ImageUploadWithCrop from "./ImageUploadWithCrop";
import { useForm } from "react-hook-form";
import { Close as CloseIcon } from "@mui/icons-material";
import { Autocomplete, Box, createFilterOptions } from "@mui/material";
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
  Zoom,
} from "@mui/material";

const filter = createFilterOptions();

export default function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  student,
  classes,
  isLoading,
  schoolId,
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
  const currentImage = watch("image");

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
    if (isOpen) {
      fetch(`/api/parents?schoolId=${schoolId}`)
        .then((res) => res.json())
        .then((data) => setParents(data));

      if (student) {
        reset({
          ...student,
          image: student.image || "",
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
          image: "",
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

  useEffect(() => {
    if (!studentGender) return;
    if (!student) return;
    const isAvatar =
      currentImage === "/studentfemale-avatar.jpg" ||
      currentImage === "/studentmale-avatar.jpg";

    if (isAvatar) {
      setValue(
        "image",
        studentGender === "Female"
          ? "/studentfemale-avatar.jpg"
          : "/studentmale-avatar.jpg",
      );
    }
  }, [studentGender]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
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
        <span className=" text-foreground text-sm uppercase">
          {student
            ? `Edit Profile of ${student.fullName}`
            : "Student Admission Form"}
        </span>
        <IconButton
          onClick={onClose}
          size="small"
          tabIndex={-1}
          sx={{
            color: "var(--muted-foreground)",
            "&:hover": { backgroundColor: "var(--muted)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form
        onSubmit={handleSubmit((data) => {
          if (!data.image || data.image.startsWith("/student")) {
            data.image =
              data.gender === "Female"
                ? "/studentfemale-avatar.jpg"
                : "/studentmale-avatar.jpg";
          }
          onSubmit({ ...data, isNewParent: student ? false : isNewParent });
        })}
      >
        <DialogContent
          dividers
          sx={{
            backgroundColor: "var(--background)",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div className="flex flex-row gap-4 items-start">
            {/* Left: Image */}
            <div className="flex-shrink-0">
              <div
                className="flex flex-col items-center justify-center p-1 border-2 border-dashed rounded-xl h-36 w-36"
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
                      className="w-24 h-24 rounded-full object-cover shadow-md"
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
                          backgroundColor: "rgba(239, 68, 68, 0.3)",
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
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  fullWidth
                  label="Full Name *"
                  className="col-span-2"
                  {...register("fullName")}
                  size="small"
                />
                <TextField
                  select
                  fullWidth
                  label="Gender *"
                  value={studentGender || "Male"}
                  onChange={(e) => setValue("gender", e.target.value)}
                  size="small"
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </TextField>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth *"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register("dateOfBirth")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Cast"
                  {...register("cast")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Religion"
                  {...register("religion")}
                  size="small"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  fullWidth
                  label="Nationality"
                  {...register("nationality")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Place of Birth"
                  {...register("placeOfBirth")}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="B-Form / CNIC"
                  {...register("bFormNumber")}
                  size="small"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
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

          <div>
            <Autocomplete
              value={parents.find((p: any) => p._id === parentIdValue) || null}
              onChange={(event, newValue: any) => {
                if (newValue && newValue.inputValue) {
                  setIsNewParent(true);
                  setValue("parentId", "");
                  setValue("parentData.fullName", newValue.inputValue);
                } else if (newValue) {
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
                    fullName: `Add "${inputValue}" as New Parent`,
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
                    className={`${optionProps.className} border-b last:border-0 py-1`}
                  >
                    <Box className="flex items-center gap-2 w-full">
                      {!isAddNew && (
                        <Typography
                          variant="caption"
                          className="text-sm bg-slate-200 px-2 py-0.5 rounded text-slate-600 min-w-[20px] text-center"
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
                              : "font-semibold min-w-[120px]"
                          }
                        >
                          {option.fullName}
                        </Typography>

                        {/* CNIC & Phone Section (Sirf purane parents ke liye) */}
                        {!isAddNew && (
                          <Box className="flex gap-4 items-center">
                            <Typography
                              variant="caption"
                              className="bg-blue-50 text-blue-700 px-1 rounded border border-blue-100"
                            >
                              <strong>CNIC:</strong> {option.cnic || "N/A"}
                            </Typography>
                            <Typography
                              variant="caption"
                              className="bg-green-50 text-green-700 px-1 rounded border border-green-100"
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
                  helperText="Type to search, if parent exists select from list, otherwise click 'Add' and fill in the details"
                  FormHelperTextProps={{
                    sx: { color: "#3A9AFF" },
                  }}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
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
        </DialogContent>
        <Divider />
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
              "&:hover": { backgroundColor: "var(--muted)" },
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
              : student
                ? "Update Student"
                : "Confirm Admission"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
