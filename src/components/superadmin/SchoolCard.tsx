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
  ChevronDown,
} from "lucide-react";
import { notify } from "@/lib/notify";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface SchoolCardProps {
  school: any;
  onEdit: (school: any) => void;
  onSwitch: (id: string) => void;
  onExpand: (id: string) => void;
  onRefresh: () => void;
  isExpanded: boolean;
}

const SchoolCard = ({
  school,
  onEdit,
  onSwitch,
  onExpand,
  onRefresh,
  isExpanded,
}: SchoolCardProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/superadmin/schools?id=${school._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
        notify.success("Deleted!", `${school.name} has been deleted`);
      } else {
        notify.error("Failed!", "Could not delete school");
      }
    } catch (err) {
      notify.error("Error!", "Something went wrong");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = school.status === "active" ? "inactive" : "active";
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
    } catch (err) {
      notify.error("Error!", "Something went wrong");
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-md border transition-all duration-300 ${
        isExpanded
          ? "border-indigo-400 ring-1 ring-indigo-50 shadow-sm"
          : "border-slate-100"
      }`}
      style={{ transition: "all 0.3s ease-in-out" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 15px 30px rgba(0,0,0,0.20)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4 rounded-md">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative cursor-pointer" onClick={handleToggleStatus}>
            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
              {school.logo ? (
                <img
                  src={school.logo}
                  className="object-cover w-full h-full"
                  alt="logo"
                />
              ) : (
                <Building2 className="text-slate-300" size={20} />
              )}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${school.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                {school.name}
              </h3>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${school.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
              >
                {school.status}
              </span>
            </div>
            <div className="flex gap-x-3 mt-0.5 text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin size={12} /> {school.address}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Phone size={12} /> {school.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50">
          <div className="flex flex-1 md:flex-col lg:flex-row gap-2 w-full lg:w-auto items-center">
            <Link
              href={`/superadmin/schools/${school._id}`}
              className="flex-1 md:w-full lg:w-auto bg-slate-900 text-white p-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-600 transition-all shadow-sm whitespace-nowrap"
            >
              <ExternalLink size={14} className="shrink-0" />{" "}
              <span>View Invoices</span>
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitch(school._id);
              }}
              className="flex-1 md:w-full lg:w-auto bg-slate-900 text-white p-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-600 transition-all shadow-sm whitespace-nowrap cursor-pointer"
            >
              <ExternalLink size={14} className="shrink-0" />{" "}
              <span>Dashboard</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(school);
              }}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-[1px] h-6 bg-slate-400 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(school._id);
              }}
              className={`p-2 rounded-lg transition-all cursor-pointer ${isExpanded ? "bg-indigo-50 text-indigo-600 rotate-180" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={school.name}
      />
    </div>
  );
};

export default SchoolCard;
