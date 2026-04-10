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
import { zodResolver } from "@hookform/resolvers/zod";
import { validationSchema } from "@/lib/validation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(validationSchema),
    mode: "onTouched",
    defaultValues: {
      classId: "",
      status: "active",
      gender: "Male",
      parentData: { gender: "Male" },
    },
  });
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
    (url: string) => {
      setValue("image", url, { shouldDirty: true });
    },
    [setValue],
  );

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/parents?schoolId=${schoolId}`)
        .then((res) => res.json())
        .then((data) => setParents(data));

      if (student) {
        setIsNewParent(false);

        reset({
          ...student,
          image:
            student.image && student.image.trim() !== ""
              ? student.image
              : student.gender === "Female"
                ? "/studentfemale-avatar.jpg"
                : "/studentmale-avatar.jpg",
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
          parentData: {
            fullName: "",
            cnic: "",
            phone: "",
            address: "",
            gender: "Male",
          },
        });
      } else {
        setIsNewParent(false);
        reset({
          fullName: "",
          gender: "Male",
          image: "",
          cast: "",
          religion: "Islam",
          nationality: "Pakistani",
          status: "active",
          classId: "",
          section: "",
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
      }
    }
  }, [isOpen, student, reset, schoolId]);

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
      currentImage === "/studentmale-avatar.jpg" ||
      currentImage === "/studentfemale-avatar.jpg";

    if (isAvatar) {
      setValue(
        "image",
        studentGender === "Female"
          ? "/studentfemale-avatar.jpg"
          : "/studentmale-avatar.jpg",
        { shouldDirty: true },
      );
    }
  }, [studentGender, currentImage, student, setValue]);

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
          let finalImage = data.image;

          if (
            !finalImage ||
            finalImage.trim() === "" ||
            finalImage.startsWith("/student")
          ) {
            finalImage =
              data.gender === "Female"
                ? "/studentfemale-avatar.jpg"
                : "/studentmale-avatar.jpg";
          }

          const payload = {
            ...data,
            image: finalImage,
            schoolId: schoolId,
            isNewParent: student ? false : isNewParent,
          };

          onSubmit(payload);
          setIsNewParent(false);
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
                {currentImage === "loading" ? (
                  <div
                    className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
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
                      onClick={() => {
                        setValue("image", "");
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageUploadWithCrop
                      onImageCropped={handleImageDone}
                      schoolId={schoolId || ""}
                      folder="students"
                    />
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
                  error={!!errors.fullName}
                  helperText={errors.fullName?.message as string}
                />
                <TextField
                  select
                  fullWidth
                  label="Gender"
                  value={studentGender || "Male"}
                  onChange={(e) => setValue("gender", e.target.value)} // Simple update
                  size="small"
                  SelectProps={{
                    native: true,
                  }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
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
                  error={!!errors.dateOfBirth}
                  helperText={errors.dateOfBirth?.message as string}
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
                onChange={(e) => {
                  setValue("classId", e.target.value, { shouldValidate: true });
                }}
                size="small"
                SelectProps={{
                  native: true,
                }}
                InputLabelProps={{ shrink: true }}
                error={!!errors.classId}
                helperText={errors.classId?.message as string}
              >
                <option value="" disabled>
                  Select Class
                </option>
                {classes.map((c: any) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
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
                onChange={(e) => {
                  setValue("section", e.target.value, { shouldValidate: true });
                }}
                size="small"
                SelectProps={{
                  native: true,
                }}
                InputLabelProps={{ shrink: true }}
                error={!!errors.section}
                helperText={errors.section?.message as string}
              >
                <option value="" disabled>
                  Select Section
                </option>
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
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
                  label="Father Name *"
                  {...register("parentData.fullName")}
                  size="small"
                  error={!!(errors.parentData as any)?.fullName}
                  helperText={
                    (errors.parentData as any)?.fullName?.message as string
                  }
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
                  SelectProps={{
                    native: true,
                  }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </TextField>
                <TextField
                  fullWidth
                  label="CNIC Number *"
                  {...register("parentData.cnic")}
                  size="small"
                  error={!!(errors.parentData as any)?.cnic}
                  helperText={
                    (errors.parentData as any)?.cnic?.message as string
                  }
                />
                <TextField
                  fullWidth
                  label="Phone *"
                  {...register("parentData.phone")}
                  size="small"
                  error={!!(errors.parentData as any)?.phone}
                  helperText={
                    (errors.parentData as any)?.phone?.message as string
                  }
                />
                <TextField
                  fullWidth
                  label="Occupation (Peshaha)"
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
              select
              fullWidth
              label="Relation with Student"
              {...register("guardianRelation")}
              size="small"
              SelectProps={{
                native: true,
              }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="" disabled>
                Select Relation
              </option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Uncle">Uncle</option>
              <option value="Aunt">Aunt</option>
              <option value="Grandfather">Grandfather</option>
              <option value="Grandmother">Grandmother</option>
              <option value="Other">Other</option>
            </TextField>
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
                SelectProps={{
                  native: true,
                }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </TextField>
            </div>
            {currentStatus === "inactive" && (
              <>
                <div className="md:col-span-4">
                  <TextField
                    fullWidth
                    type="date"
                    label="Inactive Date *"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...register("inactiveDate")}
                    size="small"
                    error={!!errors.inactiveDate}
                    helperText={errors.inactiveDate?.message as string}
                  />
                </div>
                <div className="md:col-span-4">
                  <TextField
                    fullWidth
                    label="Reason for Inactive *"
                    {...register("inactiveReason")}
                    size="small"
                    error={!!errors.inactiveReason}
                    helperText={errors.inactiveReason?.message as string}
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
                : student
                  ? "Update Student"
                  : "Confirm Admission"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
