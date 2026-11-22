"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  ExternalLink,
  Edit,
  Trash2,
  Power,
  FileSpreadsheet,
  Loader2,
  Lock,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notify } from "@/lib/notify";
import { toYMD } from "@/lib/pkTime";
import SchoolDeleteDialog from "./SchoolDeleteDialog";
import { AdminList } from "./UserList";
import { expiryInfo, TONE_TEXT } from "./schoolUtils";

interface Props {
  school: any;
  users: any[];
  usersLoading?: boolean;
  onEdit: (school: any) => void;
  onSwitch: (school: any) => void;
  onRefresh: () => void;
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (id: string) => void;
}

export default function SchoolDetailPanel({
  school,
  users,
  usersLoading,
  onEdit,
  onSwitch,
  onRefresh,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const isActive = school.status === "active";
  const exp = expiryInfo(school.expiryDate);

  // Save the new status
  const updateStatus = async (newStatus: "active" | "inactive") => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/superadmin/schools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school._id, status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
        notify.success("Status Updated!", `School is now ${newStatus}`);
      } else {
        notify.error("Failed!", "Could not update status");
      }
    } catch {
      notify.error("Error!", "Something went wrong");
    } finally {
      setStatusLoading(false);
      setInactiveOpen(false);
    }
  };

  // Active → ask first. Inactive → activate (unless expired)
  const toggleStatus = () => {
    if (statusLoading) return;
    if (isActive) return setInactiveOpen(true);
    if (school.expiryDate && toYMD() > toYMD(school.expiryDate)) {
      notify.error("Expired!", "Extend the expiry date first (Edit)");
      return;
    }
    updateStatus("active");
  };

  // School's data as Excel (handover, without deleting)
  const downloadExcel = async () => {
    if (excelLoading) return;
    setExcelLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/schools?id=${school._id}&data=excel`,
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${school.slug || "school"}-data-${toYMD()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("Downloaded!", `${school.name} data exported`);
    } catch {
      notify.error("Failed!", "Could not export the data");
    } finally {
      setExcelLoading(false);
    }
  };

  const btn =
    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap";

  const stat = (
    label: string,
    value: React.ReactNode,
    sub?: React.ReactNode,
  ) => (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
      {sub && <p className="text-[11px]">{sub}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1 overflow-hidden">
              {school.logo ? (
                <img
                  src={school.logo}
                  className="max-w-full max-h-full object-contain"
                  alt="logo"
                />
              ) : (
                <Building2 className="text-slate-300" size={22} />
              )}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isActive ? "bg-emerald-500" : "bg-rose-500"}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-slate-800 uppercase tracking-tight truncate">
                {school.name}
              </h2>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
              >
                {school.status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {school.slug}
            </p>
            <div className="flex flex-wrap gap-x-3 mt-0.5 text-slate-400 text-[11px]">
              {school.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {school.address}
                </span>
              )}
              {school.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {school.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSwitch(school)}
          className="shrink-0 bg-slate-900 text-white px-3 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <ExternalLink size={14} /> Open Dashboard
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {stat(
          "Plan",
          school.planId?.name || "—",
          <span className="text-slate-500">
            Rs. {Number(school.customPrice || 0).toLocaleString()}
          </span>,
        )}
        {stat(
          "Expiry",
          <span className={TONE_TEXT[exp.tone]}>{exp.label}</span>,
        )}
        {stat(
          "Active Students",
          Number(school.studentCount ?? 0).toLocaleString(),
        )}
        {stat("Users", usersLoading ? "…" : users.length)}
      </div>

      {/* Actions */}
            {/* Actions — equal width, full row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 px-4 pb-4 border-b border-slate-100">
        <Link
          href={`/superadmin/schools/${school._id}`}
          className={`${btn} justify-center w-full border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          <FileText size={14} /> View Invoices
        </Link>
        <button
          onClick={downloadExcel}
          disabled={excelLoading}
          className={`${btn} justify-center w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        >
          {excelLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Excel
        </button>
        <button
          onClick={() => onEdit(school)}
          className={`${btn} justify-center w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50`}
        >
          <Edit size={14} /> Edit
        </button>
        <button
          onClick={toggleStatus}
          disabled={statusLoading}
          title={isActive ? "Make inactive (lock the school)" : "Make active"}
          className={`${btn} justify-center w-full ${
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          {statusLoading ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
          {isActive ? "Active" : "Inactive"}
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className={`${btn} justify-center w-full border-rose-200 text-rose-600 hover:bg-rose-50`}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Users */}
      <div className="p-4">
        <AdminList
          users={users}
          loading={usersLoading}
          onAddAdmin={onAddUser}
          onEditAdmin={onEditUser}
          onDeleteAdmin={onDeleteUser}
        />
      </div>

      {/* Make inactive → confirm */}
      <AlertDialog
        open={inactiveOpen}
        onOpenChange={(v) => !statusLoading && setInactiveOpen(v)}
      >
        <AlertDialogContent className="rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-500 dark:bg-slate-900 z-[9999]">
          <AlertDialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Lock size={18} />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Make {school.name} inactive?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              The school will be locked. Its admin and staff will not be able to
              log in until you make it active again. No data is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              disabled={statusLoading}
              className="cursor-pointer font-semibold border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => updateStatus("inactive")}
              disabled={statusLoading}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
            >
              {statusLoading && <Loader2 size={14} className="animate-spin" />}
              {statusLoading ? "Saving..." : "Make Inactive"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete: inactive only → download → type slug */}
      <SchoolDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        school={school}
        onDeleted={onRefresh}
      />
    </div>
  );
}
