"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Close as CloseIcon,
  SupervisorAccount as ParentIcon,
  People as SiblingIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parent: any;
  onStudentClick: (student: any) => void;
}

export default function ParentProfileModal({
  isOpen,
  onClose,
  parent,
  onStudentClick,
}: Props) {
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetching siblings based on parentId
  useEffect(() => {
    if (isOpen && parent?._id) {
      const fetchSiblings = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/students?parentId=${parent._id}`);
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
  }, [isOpen, parent]);

  if (!parent) return null;

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="mb-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900">{value || "---"}</p>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper" // Header/Footer ko fix rakhne ke liye
    >
      <DialogTitle className="flex justify-between items-center bg-slate-50 border-b p-4">
        <div className="flex items-center gap-2">
          <ParentIcon className="text-amber-600" />
          <span className="font-bold text-lg">Parent Profile Card</span>
        </div>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Height set to 80vh as requested */}
      <DialogContent className="p-0" sx={{ maxHeight: "80vh" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Section 1: Parent Basic Info */}
          <div className="p-5 bg-white">
            <h3 className="text-amber-600 font-bold text-xs flex items-center gap-1 mb-4 uppercase tracking-widest">
              Parent Details
            </h3>
            <DetailRow label="Full Name" value={parent.fullName} />
            <DetailRow label="Parent ID (P_ID)" value={parent.p_id} />
            <DetailRow label="CNIC Number" value={parent.cnic} />
            <DetailRow label="Phone Number" value={parent.phone} />
            <DetailRow label="Gender" value={parent.gender} />
            <DetailRow label="Occupation" value={parent.occupation} />
            <DetailRow label="Address" value={parent.address} />
          </div>

          {/* Section 2: Login Credentials */}
          <div className="p-5 bg-slate-50/50">
            <h3 className="text-purple-600 font-bold text-xs flex items-center gap-1 mb-4 uppercase tracking-widest">
              <KeyIcon sx={{ fontSize: 14 }} /> Login Credentials
            </h3>
            <DetailRow label="Parent Portal Email" value={parent.email} />
            <DetailRow label="Default Password" value={parent.password} />
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-[10px] text-purple-700 leading-tight italic">
                * Ye credentials parents ko portal login ke liye faraham kiye ja
                saktay hain.
              </p>
            </div>
          </div>

          {/* Section 3: Siblings (Registered Students) */}
          <div className="p-5 bg-white">
            <h3 className="text-blue-600 font-bold text-xs flex items-center gap-1 mb-4 uppercase tracking-widest">
              <SiblingIcon sx={{ fontSize: 14 }} /> Registered Children
            </h3>

            {loading ? (
              <p className="text-xs text-gray-400 animate-pulse">
                Data loading...
              </p>
            ) : siblings.length > 0 ? (
              <div className="space-y-3">
                {siblings.map((child: any) => (
                  <div
                    key={child._id}
                    className="p-2 border border-slate-100 rounded-md bg-slate-50 flex justify-between items-center shadow-sm cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => onStudentClick(child)}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {child.fullName}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        GR:{" "}
                        <span className="text-blue-600 font-medium">
                          {child.grNumber}
                        </span>{" "}
                        | Class:{" "}
                        <span className="text-slate-700">
                          {child.classId?.name || "N/A"}
                        </span>
                      </p>
                    </div>
                    <Chip
                      label={child.status}
                      size="small"
                      variant="outlined"
                      color={child.status === "active" ? "success" : "error"}
                      sx={{
                        height: 18,
                        fontSize: "9px",
                        fontWeight: "bold",
                        textTransform: "capitalize",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400 italic">
                  No students linked to this parent ID.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
