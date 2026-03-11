"use client";
import { useState, useEffect } from "react";
import { X, Plus, Layers, Clock, Users, Check } from "lucide-react";

export const PlanModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
}: any) => {
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (!isOpen) setFeatureInput("");
  }, [isOpen]);

  if (!isOpen) return null;

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter(
      (_: any, i: number) => i !== index,
    );
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden transition-all">
        {/* Header - Invoice Modal Style */}
        <div className="px-8 py-5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <Layers size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-wider">
                {isEditing ? "Edit Plan" : "Plan Generator"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6">
          {/* Main Inputs */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">
                Plan Name
              </label>
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300"
                placeholder="e.g. Premium"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">
                Price (PKR)
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                placeholder="0.00"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Cycle & Limit Row */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} strokeWidth={3} /> Billing Cycle
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer"
                value={formData.interval || "month"}
                onChange={(e) =>
                  setFormData({ ...formData, interval: e.target.value })
                }
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest flex items-center gap-1">
                <Users size={12} strokeWidth={3} /> Student Limit
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                placeholder="0 = Unlimited"
                value={formData.schoolLimit || ""}
                onChange={(e) =>
                  setFormData({ ...formData, schoolLimit: e.target.value })
                }
              />
            </div>
          </div>

          {/* Features Section - Indigo Box Style like Invoice feeding */}
          <div className="p-4 bg-indigo-50/50 rounded-[1.5rem] border border-indigo-100 space-y-3">
            <label className="text-[10px] font-black text-indigo-600 ml-1 uppercase tracking-widest">
              Include Features
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all placeholder:font-normal"
                placeholder="Type feature..."
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addFeature())
                }
              />
              <button
                type="button"
                onClick={addFeature}
                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all active:scale-90"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {formData.features?.map((feat: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black border border-indigo-100 shadow-sm"
                >
                  <Check
                    size={10}
                    strokeWidth={4}
                    className="text-emerald-500"
                  />
                  {feat}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions - Slate 900 Style */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-100 active:scale-[0.98] border-b-4 border-indigo-500"
            >
              {isEditing ? "Update Plan" : "Generate Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
