import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Edit,
  Trash2,
  ChevronDown,
  Shield,
  Phone,
  Mail,
  KeyRound,
  Clock,
  Eye,
  EyeOff,
  Power,
  Loader2,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface AdminListProps {
  users: any[];
  loading?: boolean;
  onAddAdmin: () => void;
  onEditAdmin: (user: any) => void;
  onDeleteAdmin: (id: string) => void;
}

const roleConfig: Record<string, { label: string; badge: string; avatar: string }> = {
  school_admin: { label: "School Admin", badge: "bg-violet-50 text-violet-700 border-violet-200", avatar: "bg-violet-500" },
  accountant: { label: "Accountant", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", avatar: "bg-emerald-500" },
  cashier: { label: "Cashier", badge: "bg-amber-50 text-amber-700 border-amber-200", avatar: "bg-amber-500" },
  helpdesk: { label: "Helpdesk", badge: "bg-sky-50 text-sky-700 border-sky-200", avatar: "bg-sky-500" },
  staff: { label: "Custom Role", badge: "bg-slate-50 text-slate-600 border-slate-200", avatar: "bg-slate-500" },
};

const fallbackRole = (role: string) => ({
  label: role || "User",
  badge: "bg-slate-50 text-slate-600 border-slate-200",
  avatar: "bg-slate-500",
});

const lastLogin = (v: any) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Never";

export const AdminList = ({ users, loading, onAddAdmin, onEditAdmin, onDeleteAdmin }: AdminListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState<string | null>(null);

  // Another school → close open rows, hide answers
  useEffect(() => {
    setExpandedRow(null);
    setShowAnswer(null);
  }, [users]);

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setDeletingName(name);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    onDeleteAdmin(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const field = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="text-xs text-slate-700 break-words">{value}</div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-50 rounded-lg">
            <Shield size={14} className="text-violet-600" />
          </div>
          <h4 className="font-bold text-slate-700 text-sm">Users</h4>
          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
            {loading ? "…" : users.length}
          </span>
        </div>
        <button
          onClick={onAddAdmin}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <UserPlus size={13} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading users…
        </div>
      ) : users.length > 0 ? (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {users.map((u) => {
            const config = roleConfig[u.role] || fallbackRole(u.role);
            const isExpanded = expandedRow === u._id;
            const answerVisible = showAnswer === u._id;
            const answer = u.securityQuestion?.answer;

            return (
              <div key={u._id} className={isExpanded ? "bg-indigo-50/40" : "bg-white"}>
                {/* Row */}
                <div
                  onClick={() => setExpandedRow(isExpanded ? null : u._id)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {u.image && !u.image.includes("avatar") ? (
                    <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${config.avatar}`}>
                      {u.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700 text-xs truncate">{u.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.badge}`}>{config.label}</span>
                      {u.isActive === false && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-rose-50 text-rose-600 border-rose-200">
                          Login off
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pl-14 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-md border border-slate-200 bg-white p-3">
                      {field(<Mail size={12} />, "Email", u.email)}
                      {field(<Phone size={12} />, "Phone", u.phone || <span className="italic text-slate-300">Not set</span>)}
                      {field(<Clock size={12} />, "Last Login", lastLogin(u.lastLoginAt))}
                      {field(
                        <Power size={12} />,
                        "Login",
                        u.isActive === false ? (
                          <span className="font-semibold text-rose-600">Off</span>
                        ) : (
                          <span className="font-semibold text-emerald-600">On</span>
                        ),
                      )}
                      {field(
                        <KeyRound size={12} />,
                        "Security Question",
                        u.securityQuestion?.question || <span className="italic text-slate-300">Not set</span>,
                      )}
                      {field(
                        <KeyRound size={12} />,
                        "Answer",
                        answer ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono">{answerVisible ? answer : "••••••"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAnswer(answerVisible ? null : u._id);
                              }}
                              title={answerVisible ? "Hide answer" : "Show answer"}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            >
                              {answerVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </span>
                        ) : (
                          <span className="italic text-slate-300">Not set</span>
                        ),
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAdmin(u);
                        }}
                        className="flex items-center gap-1 rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, u._id, u.name)}
                        className="flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield size={20} className="text-slate-300" />
          </div>
          <p className="text-xs text-slate-400 font-medium">No users found for this school.</p>
          <p className="text-[10px] text-slate-300 mt-1">Click "Add User" to create access</p>
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingName}
      />
    </div>
  );
};