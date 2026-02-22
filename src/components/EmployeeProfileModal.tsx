"use client";
import {
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  Zoom,
} from "@mui/material";
import {
  Briefcase,
  User,
  Shield,
  AlertCircle,
  Clock,
  Edit,
  X,
  Printer,
} from "lucide-react";
import { calculateTenure, formatDate } from "@/lib/tenureUtils";
import {} from "./ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
  onEdit: () => void; // Ye line add karein
}

export default function EmployeeProfileModal({
  isOpen,
  onClose,
  staff,
  onEdit, // Ye line add karein
}: Props) {
  if (!staff) return null;

  const displayImg =
    staff.image ||
    (staff.gender === "female" ? "/female-avatar.jpg" : "/male-avatar.jpg");

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
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
        <div className="flex items-center gap-4 flex-1 mb-2  ">
          <img
            src={displayImg}
            alt={staff.fullName}
            className="w-25 h-25 rounded-md object-cover border-2 border-border flex-shrink-0"
          />

          {/* Employee Info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {staff.fullName}
            </h2>
            <div className="text-sm text-muted-foreground">
              {staff.designation}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-muted-foreground">
                ID: {staff.emp_id || "---"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  staff.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {staff.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Tenure Card - Right side */}
          <div className="p-2 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg border-2 border-sky-200 dark:border-sky-800 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider whitespace-nowrap">
                {staff.status === "active" ? "Current Tenure" : "Total Tenure"}
              </span>
            </div>
            <div className="text-sm text-sky-700 dark:text-sky-300 whitespace-nowrap">
              {calculateTenure(
                staff.joiningDate,
                staff.inactiveDate,
                staff.status,
              )}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
              Since {formatDate(staff.joiningDate)}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-2">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Personal */}
            <Section
              title="Personal Information"
              icon={<User className="w-4 h-4" />}
            >
              <InfoItem
                label="Gender"
                value={<span className="capitalize">{staff.gender}</span>}
              />
              <InfoItem
                label="Date of Birth"
                value={formatDate(staff.dateOfBirth)}
              />
              <InfoItem label="Phone" value={staff.phone} />
              <InfoItem label="NIC" value={staff.nicNumber} />
              <InfoItem label="Address" value={staff.address} />
            </Section>

            {/* Job */}
            <Section
              title="Job Details"
              icon={<Briefcase className="w-4 h-4" />}
            >
              <InfoItem
                label="Category"
                value={
                  <span className="capitalize">{staff.staffCategory}</span>
                }
              />
              <InfoItem label="Qualification" value={staff.qualification} />
              <InfoItem
                label="Experience"
                value={`${staff.experience || 0} Years`}
              />
              <InfoItem label="Subject" value={staff.subject || "N/A"} />
              <InfoItem
                label="Joining Date"
                value={formatDate(staff.joiningDate)}
              />
            </Section>
          </div>

          {/* Salary */}
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Monthly Salary
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                PKR {staff.salary?.toLocaleString() || "---"}
              </span>
            </div>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Emergency */}
            <Section
              title="Emergency Contact"
              icon={<AlertCircle className="w-4 h-4" />}
            >
              <InfoItem label="Name" value={staff.emergencyContact?.name} />
              <InfoItem
                label="Relation"
                value={staff.emergencyContact?.relation}
              />
              <InfoItem label="Phone" value={staff.emergencyContact?.phone} />
            </Section>

            {/* System */}
            <Section
              title="System Access"
              icon={<Shield className="w-4 h-4" />}
            >
              <InfoItem
                label="Role"
                value={
                  <span className="capitalize font-semibold text-purple-600 dark:text-purple-400">
                    {staff.role}
                  </span>
                }
              />
              <InfoItem label="Email" value={staff.email || "---"} />
              <InfoItem
                label="Password"
                value={
                  <span className="font-mono text-xs">
                    {staff.password || "••••••••"}
                  </span>
                }
              />
            </Section>
          </div>

          {/* Inactive Alert */}
          {staff.status === "inactive" && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  Employment Ended
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-red-500 text-xs">Date:</span>{" "}
                  <span className="text-red-600 dark:text-red-400 text-xs italic">
                    {formatDate(staff.inactiveDate)}
                  </span>
                </div>

                <div>
                  <span className="text-red-500 text-xs">Reason:</span>{" "}
                  <span className="text-red-600 dark:text-red-400 text-xs italic">
                    {staff.inactiveReason}
                  </span>
                </div>
              </div>
            </div>
          )}
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
        {/* Left side: Print Button */}
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

        {/* Right side: Cancel & Edit Buttons */}
        <Button
          onClick={onClose}
          size="small"
          startIcon={<X className="w-4 h-4" />}
          sx={{
            textTransform: "none",
            color: "var(--foreground)",
            "&:hover": {
              backgroundColor: "var(--muted)",
            },
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={onEdit}
          variant="contained"
          size="small"
          startIcon={<Edit className="w-4 h-4" />}
          sx={{
            backgroundColor: "#1e293b", // Aapke Form Modal wala color
            "&:hover": { backgroundColor: "#334155" },
            textTransform: "none",
            px: 2,
            py: 0.5,
          }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-2 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-3 text-sky-500">
        {icon}
        <h3 className="text-xs font-bold text-foreground uppercase">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-start text-xs">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <span className="text-foreground font-semibold text-right">
        {value || "---"}
      </span>
    </div>
  );
}
