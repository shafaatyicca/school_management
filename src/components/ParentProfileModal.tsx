"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Zoom,
} from "@mui/material";
import { User, Users, KeyRound, Edit } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parent: any;
  onStudentClick: (student: any) => void;
  onEdit?: (parent: any) => void;
  schoolId: string | null;
}

// Matches StudentProfileModal's InfoItem exactly
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

export default function ParentProfileModal({
  isOpen,
  onClose,
  parent,
  onStudentClick,
  onEdit,
  schoolId,
}: Props) {
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && parent?._id && schoolId) {
      const fetchSiblings = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/students?parentId=${parent._id}&schoolId=${schoolId}`,
          );
          const data = await res.json();
          setSiblings(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Failed to fetch siblings:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSiblings();
    }
  }, [isOpen, parent, schoolId]);

  if (!parent) return null;

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
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <DialogContent className="bg-background" sx={{ p: 1 }}>
        {/* ── Header: Avatar + Name + Badges ───────────────────────────── */}
        <div className="flex items-center gap-4 flex-1 mb-3">
          {/* Avatar circle with initials */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              boxShadow: "0 6px 18px rgba(245,158,11,0.3)",
            }}
          >
            {parent.fullName?.charAt(0)?.toUpperCase() || "P"}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {parent.fullName}
            </h2>
            <div className="text-sm text-muted-foreground">
              {parent.occupation || "---"}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">
                ID: {parent.p_id || "---"}
              </span>
              {parent.gender && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {parent.gender.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-4">
            {/* Personal Details */}
            <div className="p-2 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2 text-amber-500">
                <User className="w-4 h-4" />
                <h3 className="text-xs font-bold text-foreground uppercase">
                  Personal Details
                </h3>
              </div>
              <div className="space-y-3">
                <InfoItem label="Full Name" value={parent.fullName} />
                <InfoItem label="CNIC" value={parent.cnic} />
                <InfoItem label="Phone" value={parent.phone} />
                <InfoItem label="Gender" value={parent.gender} />
                <InfoItem label="Occupation" value={parent.occupation} />
                <InfoItem label="Address" value={parent.address} />
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
              <div className="space-y-2">
                <InfoItem label="Email" value={parent.email} />
                <InfoItem
                  label="Password"
                  value={
                    <span className="font-mono text-xs">
                      {parent.password || "••••••••"}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Registered Children */}
          <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold text-foreground uppercase">
                Registered Children
              </span>
              {!loading && siblings.length > 0 && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700">
                  {siblings.length}
                </span>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto space-y-1.5"
              style={{ maxHeight: "240px" }}
            >
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg bg-sky-100 dark:bg-sky-900/40 animate-pulse"
                  />
                ))
              ) : siblings.length > 0 ? (
                siblings.map((child: any) => (
                  <div
                    key={child._id}
                    onClick={() => onStudentClick(child)}
                    className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg border border-sky-100 dark:border-sky-800 bg-white dark:bg-sky-950/30 cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/40 transition-all duration-150 group"
                  >
                    <img
                      src={
                        child.image ||
                        (child.gender === "Female"
                          ? "/studentfemale-avatar.jpg"
                          : "/studentmale-avatar.jpg")
                      }
                      alt={child.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-sky-200 dark:border-sky-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 leading-tight truncate">
                        {child.fullName}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        GR:{" "}
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">
                          {child.grNumber}
                        </span>
                        {" · "}
                        <span>
                          {child.classId?.name || "N/A"} - {child.section || ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip
                        label={child.status}
                        size="small"
                        color={child.status === "active" ? "success" : "error"}
                        sx={{
                          height: 16,
                          fontSize: "8px",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-[10px] text-muted-foreground font-medium">
                    No children linked
                  </p>
                </div>
              )}
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
        {/* Cancel */}
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

        {/* Edit */}
        <Button
          onClick={() => onEdit && onEdit(parent)}
          variant="contained"
          startIcon={<Edit className="w-4 h-4" />}
          size="small"
          sx={{
            backgroundColor: "#1e293b",
            "&:hover": { backgroundColor: "#334155" },
            textTransform: "none",
            px: 1.5,
            py: 0.5,
          }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}
