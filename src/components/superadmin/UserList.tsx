import React, { useState } from "react";
import {
  UserPlus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Phone,
  Mail,
  KeyRound,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface AdminListProps {
  users: any[];
  onAddAdmin: () => void;
  onEditAdmin: (user: any) => void;
  onDeleteAdmin: (id: string) => void;
}

const roleConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; avatar: string }
> = {
  school_admin: {
    label: "School Admin",
    bg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-200",
    avatar: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
  accountant: {
    label: "Accountant",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  cashier: {
    label: "Cashier",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    avatar: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  helpdesk: {
    label: "Helpdesk",
    bg: "bg-sky-100",
    text: "text-sky-700",
    border: "border-sky-200",
    avatar: "bg-gradient-to-br from-sky-400 to-blue-500",
  },
};

export const AdminList = ({
  users,
  onAddAdmin,
  onEditAdmin,
  onDeleteAdmin,
}: AdminListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setDeletingName(name);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    onEditAdmin(user);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    onDeleteAdmin(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <div className="p-2 animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Shield size={14} className="text-violet-600" />
          </div>
          <h4 className="font-bold text-slate-700 text-sm">
            Administrative Access
          </h4>
          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
            {users.length} users
          </span>
        </div>
        <button
          onClick={onAddAdmin}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-200 cursor-pointer"
        >
          <UserPlus size={13} /> Add User
        </button>
      </div>

      {users.length > 0 ? (
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 grid grid-cols-12 px-3 py-2.5">
            <div className="col-span-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              User
            </div>
            <div className="col-span-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Role
            </div>
            <div className="col-span-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Email
            </div>
            <div className="col-span-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Phone
            </div>
            <div className="col-span-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest text-right">
              Actions
            </div>
          </div>

          {/* Rows */}
          <div className="bg-white divide-y divide-slate-100">
            {users.map((u) => {
              const config = roleConfig[u.role] || {
                label: u.role,
                bg: "bg-slate-100",
                text: "text-slate-600",
                border: "border-slate-200",
                avatar: "bg-gradient-to-br from-slate-400 to-slate-600",
              };
              const isExpanded = expandedRow === u._id;

              return (
                <React.Fragment key={u._id}>
                  {/* Main Row */}
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : u._id)}
                    className={`grid grid-cols-12 px-3 py-2.5 items-center cursor-pointer transition-all duration-200 ${
                      isExpanded ? "bg-violet-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* User */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      {u.image && !u.image.includes("avatar") ? (
                        <img
                          src={u.image}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-slate-100"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm ${config.avatar}`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="font-semibold text-slate-700 text-xs truncate max-w-[80px]">
                        {u.name}
                      </p>
                    </div>

                    {/* Role */}
                    <div className="col-span-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${config.bg} ${config.text} ${config.border}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="col-span-3 text-orange-600 hidden md:flex items-center gap-1.5">
                      <Mail size={13} className=" shrink-0" />
                      <span className="text-sm">{u.email}</span>
                    </div>

                    {/* Phone */}
                    <div className="col-span-2 text-sky-500 hidden md:flex items-center gap-1.5">
                      {u.phone ? (
                        <>
                          <Phone size={13} className=" shrink-0" />
                          <span className="text-sm">{u.phone}</span>
                        </>
                      ) : (
                        <span className="text-sm italic">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => handleEditClick(e, u)}
                        className="p-1.5 text-indigo-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, u._id, u.name)}
                        className="p-1.5 text-rose-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="text-slate-400 ml-0.5">
                        {isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Row — sirf security question + answer */}
                  {isExpanded && (
                    <div className="bg-gradient-to-r from-violet-50/80 to-indigo-50/50 px-4 py-3 border-t border-violet-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Security Question */}
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 bg-white rounded-lg border border-amber-200 mt-0.5 shrink-0">
                            <KeyRound size={11} className="text-amber-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Security Question
                            </p>
                            <p className="text-xs text-slate-600">
                              {u.securityQuestion?.question || (
                                <span className="italic text-slate-300">
                                  Not set
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Answer */}
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 bg-white rounded-lg border border-emerald-200 mt-0.5 shrink-0">
                            <KeyRound size={11} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Answer
                            </p>
                            <p className="text-xs text-slate-600">
                              {u.securityQuestion?.answer || (
                                <span className="italic text-slate-300">
                                  Not set
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield size={20} className="text-slate-300" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            No users found for this school.
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            Click "Add User" to create access
          </p>
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
