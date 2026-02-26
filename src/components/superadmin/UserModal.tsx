"use client";
import { X, Loader2, Shield } from "lucide-react";

export const UserModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-lg">
              {isEditing ? "Edit Admin" : "Add New Admin"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
              Full Name
            </label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all bg-slate-50"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
              Email Address
            </label>
            <input
              required
              type="email"
              disabled={isEditing}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all bg-slate-50 disabled:opacity-50"
              placeholder="admin@school.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          {!isEditing && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Password
              </label>
              <input
                required
                type="password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition-all bg-slate-50"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
          >
            {isEditing ? "Update Admin" : "Create Admin Access"}
          </button>
        </form>
      </div>
    </div>
  );
};
