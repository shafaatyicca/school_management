"use client";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export default function StudentProfileModal({
  isOpen,
  onClose,
  student,
}: Props) {
  if (!student) return null;

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="mb-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900">{value || "---"}</p>
    </div>
  );

  const formatDate = (date: any) =>
    date
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(date))
      : "---";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle className="flex justify-between items-center bg-slate-50 border-b p-4">
        <div className="flex items-center gap-2">
          <PersonIcon className="text-blue-600" />
          <span className="font-bold text-lg">Student Profile Card</span>
        </div>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="p-0" sx={{ maxHeight: "80vh" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Section 1: Personal Info */}
          <div className="p-5 bg-white">
            <h3 className="text-blue-600 font-bold text-xs flex items-center gap-1 mb-4">
              PERSONAL INFO
            </h3>
            <DetailRow label="Full Name" value={student.fullName} />
            <DetailRow label="GR Number" value={student.grNumber} />
            <DetailRow label="Gender" value={student.gender} />
            <DetailRow
              label="Date of Birth"
              value={formatDate(student.dateOfBirth)}
            />
            <DetailRow label="Cast" value={student.cast} />
            <DetailRow label="Religion" value={student.religion} />
            <DetailRow label="Nationality" value={student.nationality} />
            <DetailRow label="B-Form / CNIC" value={student.bFormNumber} />
            <DetailRow label="Place of Birth" value={student.placeOfBirth} />
          </div>

          {/* Section 2: Academic Info */}
          <div className="p-5 bg-slate-50/50">
            <h3 className="text-emerald-600 font-bold text-xs flex items-center gap-1 mb-4">
              ACADEMIC INFO
            </h3>
            <DetailRow
              label="Current Class"
              value={`${student.classId?.name || "N/A"} - ${student.section}`}
            />
            <DetailRow
              label="Enrollment Date"
              value={formatDate(student.enrollmentDate)}
            />
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                Status
              </p>
              <Chip
                label={student.status}
                size="small"
                color={student.status === "active" ? "success" : "error"}
                sx={{
                  height: 20,
                  fontSize: "10px",
                  textTransform: "capitalize",
                  fontWeight: "bold",
                }}
              />
            </div>
            <DetailRow label="Previous School" value={student.previousSchool} />
            {student.status === "inactive" && (
              <>
                <DetailRow
                  label="Inactive Date"
                  value={formatDate(student.inactiveDate)}
                />
                <DetailRow
                  label="Inactive Reason"
                  value={student.inactiveReason}
                />
              </>
            )}
            <DetailRow label="Detailed Note" value={student.detailedNote} />

            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-purple-600 font-bold text-xs flex items-center gap-1 mb-4">
                <KeyIcon sx={{ fontSize: 14 }} /> LOGIN CREDENTIALS
              </h3>
              <DetailRow label="System Email" value={student.email} />
              <DetailRow label="Password" value={student.password} />
            </div>
          </div>

          {/* Section 3: Family Info */}
          <div className="p-5 bg-white">
            <h3 className="text-amber-600 font-bold text-xs flex items-center gap-1 mb-4">
              FAMILY INFO
            </h3>
            <DetailRow
              label="Father Name"
              value={
                typeof student.parentId === "object"
                  ? student.parentId?.fullName
                  : "---"
              }
            />
            <DetailRow
              label="Father Phone"
              value={
                typeof student.parentId === "object"
                  ? student.parentId?.phone
                  : "---"
              }
            />
            <hr className="my-3 border-slate-100" />
            <DetailRow label="Mother Name" value={student.motherName} />
            <DetailRow
              label="Mother Profession"
              value={student.motherProfession}
            />
            <DetailRow label="Mother Phone" value={student.motherPhone} />
            <hr className="my-3 border-slate-100" />
            <DetailRow label="Guardian Name" value={student.guardianName} />
            <DetailRow
              label="Guardian Relation"
              value={student.guardianRelation}
            />
            <DetailRow label="Guardian Phone" value={student.guardianPhone} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
