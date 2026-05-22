"use client";
import {
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  Chip,
  Zoom,
} from "@mui/material";
import {
  BookOpen,
  User,
  Users,
  AlertCircle,
  Clock,
  Edit,
  Printer,
  KeyRound,
} from "lucide-react";
import { calculateTenure, calculateAge, formatDate } from "@/lib/tenureUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onEdit: () => void;
  schoolId?: string;
}

export default function StudentProfileModal({
  isOpen,
  onClose,
  student,
  onEdit,
  schoolId,
}: Props) {
  if (!student) return null;
  const displayImg =
    student.image ||
    (student.gender === "Female"
      ? "/studentfemale-avatar.jpg"
      : "/studentmale-avatar.jpg");

  const yearsEnrolled = calculateTenure(
    student.enrollmentDate,
    student.inactiveDate,
    student.status,
  );
  const studentAge = calculateAge(student.dateOfBirth);
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <DialogContent className="bg-background" sx={{ p: 1 }}>
        {/* Top: Image + Info + Enrollment Card */}
        <div className="flex items-center gap-4 flex-1 mb-3">
          <img
            src={displayImg}
            alt={student.fullName}
            className="w-24 h-24 rounded-md object-cover border-2 border-border flex-shrink-0"
          />

          {/* Student Info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {student.fullName}
            </h2>
            <div className="text-sm text-muted-foreground">
              {student.classId?.name || "N/A"} — {student.section || "---"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-muted-foreground">
                GR# {student.grNumber || "---"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  student.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {student.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Enrollment Duration Card */}
          <div className="p-2 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg border-2 border-sky-200 dark:border-sky-800 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider whitespace-nowrap">
                Current Tenure
              </span>
            </div>
            <div className="text-sm text-sky-700 dark:text-sky-300 whitespace-nowrap">
              {yearsEnrolled}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
              Since {formatDate(student.enrollmentDate)}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-3">
          {/* Main Grid */}

          {/* Personal Info - full width, 3 columns andar */}
          <div className="p-2 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2 text-sky-500">
              <User className="w-4 h-4" />
              <h3 className="text-xs font-bold text-foreground uppercase">
                Personal Info
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <InfoItem label="Gender" value={student.gender} />
              <InfoItem label="Age" value={studentAge} />
              <InfoItem
                label="Date of Birth"
                value={formatDate(student.dateOfBirth)}
              />
              <InfoItem label="Cast" value={student.cast} />
              <InfoItem label="Religion" value={student.religion} />
              <InfoItem label="Nationality" value={student.nationality} />
              <InfoItem label="Place of Birth" value={student.placeOfBirth} />
              <InfoItem label="B-Form / CNIC" value={student.bFormNumber} />
            </div>
          </div>

          {/* Academic Info - full width */}
          <div className="p-2 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2 text-sky-500">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-xs font-bold text-foreground uppercase">
                Academic Info
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <InfoItem
                label="Class"
                value={`${student.classId?.name || "N/A"} - ${student.section || "---"}`}
              />
              <InfoItem
                label="Enrollment Date"
                value={formatDate(student.enrollmentDate)}
              />
              <InfoItem
                label="Previous School"
                value={student.previousSchool}
              />
              <InfoItem label="Remarks" value={student.detailedNote} />
              {student.status === "inactive" && (
                <>
                  <InfoItem
                    label="Inactive Date"
                    value={formatDate(student.inactiveDate)}
                  />
                  <InfoItem
                    label="Inactive Reason"
                    value={student.inactiveReason}
                  />
                </>
              )}
            </div>
          </div>

          {/* Family Info */}
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-foreground uppercase">
                Family Info
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                  Father
                </p>
                <InfoItem
                  label="Name"
                  value={
                    typeof student.parentId === "object"
                      ? student.parentId?.fullName
                      : "---"
                  }
                />
                <InfoItem
                  label="Profession"
                  value={
                    typeof student.parentId === "object"
                      ? student.parentId?.occupation
                      : "---"
                  }
                />
                <InfoItem
                  label="Phone"
                  value={
                    typeof student.parentId === "object"
                      ? student.parentId?.phone
                      : "---"
                  }
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                  Mother
                </p>
                <InfoItem label="Name" value={student.motherName} />
                <InfoItem label="Profession" value={student.motherProfession} />
                <InfoItem label="Phone" value={student.motherPhone} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                  Guardian
                </p>
                <InfoItem label="Name" value={student.guardianName} />
                <InfoItem label="Relation" value={student.guardianRelation} />
                <InfoItem label="Phone" value={student.guardianPhone} />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <InfoItem
                label="Home Address"
                value={
                  typeof student.parentId === "object"
                    ? student.parentId?.address
                    : "---"
                }
              />
            </div>
          </div>

          {/* Login Credentials */}
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-foreground uppercase">
                Login Credentials
              </span>
            </div>
            <div className="flex gap-6">
              <InfoItem label="Email" value={student.email} />
              <InfoItem
                label="Password"
                value={
                  <span className="font-mono text-xs">
                    {student.password || "••••••••"}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          px: 2,
          py: 1.5,
          gap: 1,
        }}
      >
        {/* Left: Print */}
        <Button
          onClick={() => window.print()}
          variant="outlined"
          size="small"
          startIcon={<Printer className="w-4 h-4" />}
          sx={{
            textTransform: "none",
            borderColor: "var(--border)",
            color: "var(--foreground)",
            marginRight: "auto",
            "&:hover": {
              backgroundColor: "var(--muted)",
              borderColor: "var(--border)",
            },
          }}
        >
          Print Bio Data
        </Button>

        {/* Right: Cancel & Edit */}
        <Button
          onClick={onClose}
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
          onClick={onEdit}
          variant="contained"
          startIcon={<Edit className="w-4 h-4" />}
          size="small"
          sx={{
            backgroundColor: "#1e293b",
            "&:hover": { backgroundColor: "#334155" },
            textTransform: "none",
            px: 1,
            py: 0.5,
          }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-start text-xs">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <span className="text-foreground font-semibold text-right ml-2">
        {value || "---"}
      </span>
    </div>
  );
}
