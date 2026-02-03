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
  Badge as BadgeIcon,
  VpnKey as KeyIcon,
  Work as WorkIcon,
} from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
}

export default function StaffProfileModal({ isOpen, onClose, staff }: Props) {
  if (!staff) return null;

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
          <BadgeIcon className="text-blue-600" />
          <span className="font-bold text-lg">Staff Profile Card</span>
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
              PERSONAL DETAILS
            </h3>
            <DetailRow label="Full Name" value={staff.fullName} />
            <DetailRow label="Employee ID" value={staff.emp_id} />
            <DetailRow label="NIC Number" value={staff.nicNumber} />
            <DetailRow
              label="Gender"
              value={<span className="capitalize">{staff.gender}</span>}
            />
            <DetailRow
              label="Date of Birth"
              value={formatDate(staff.dateOfBirth)}
            />
            <DetailRow label="Phone" value={staff.phone} />
            <DetailRow label="Address" value={staff.address} />

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-red-500 font-bold text-xs mb-3">
                EMERGENCY CONTACT
              </h3>
              <DetailRow
                label="Contact Person"
                value={staff.emergencyContact?.name}
              />
              <DetailRow
                label="Relation"
                value={staff.emergencyContact?.relation}
              />
              <DetailRow label="Phone" value={staff.emergencyContact?.phone} />
            </div>
          </div>

          {/* Section 2: Job & Academic Info */}
          <div className="p-5 bg-slate-50/50">
            <h3 className="text-emerald-600 font-bold text-xs flex items-center gap-1 mb-4">
              <WorkIcon sx={{ fontSize: 14 }} /> JOB INFORMATION
            </h3>
            <DetailRow label="Designation" value={staff.designation} />
            <DetailRow
              label="Category"
              value={<span className="capitalize">{staff.staffCategory}</span>}
            />
            <DetailRow label="Qualification" value={staff.qualification} />
            <DetailRow label="Experience" value={`${staff.experience} Years`} />
            <DetailRow label="Subject Specialization" value={staff.subject} />
            <DetailRow
              label="Salary"
              value={staff.salary ? `Rs. ${staff.salary}` : "---"}
            />
            <DetailRow
              label="Joining Date"
              value={formatDate(staff.joiningDate)}
            />

            <div className="mt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                Job Status
              </p>
              <Chip
                label={staff.status}
                size="small"
                color={staff.status === "active" ? "success" : "error"}
                sx={{
                  height: 20,
                  fontSize: "10px",
                  textTransform: "capitalize",
                  fontWeight: "bold",
                }}
              />
            </div>

            {staff.status === "inactive" && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-100">
                <DetailRow
                  label="Leaving Date"
                  value={formatDate(staff.inactiveDate)}
                />
                <DetailRow label="Reason" value={staff.inactiveReason} />
              </div>
            )}
          </div>

          {/* Section 3: Account & Credentials */}
          <div className="p-5 bg-white">
            <h3 className="text-purple-600 font-bold text-xs flex items-center gap-1 mb-4">
              <KeyIcon sx={{ fontSize: 14 }} /> ACCOUNT CREDENTIALS
            </h3>
            <DetailRow
              label="System Role"
              value={<span className="capitalize">{staff.role}</span>}
            />
            <DetailRow label="Official Email" value={staff.email} />
            <DetailRow label="Login Password" value={staff.password} />

            <div className="mt-10 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[11px] text-blue-700 italic">
                Note: This employee profile is part of the system's official
                staff records. Any changes to salary or role must be authorized.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
