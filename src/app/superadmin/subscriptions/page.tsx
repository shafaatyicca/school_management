"use client";
import { useState, useEffect } from "react"; // useEffect add kiya
import { Plus, Trash2, Edit3, CheckCircle2, Loader2 } from "lucide-react";
import { PlanModal } from "@/components/superadmin/PlanModal";

export default function SubscriptionsPage() {
  // 1. States ko yahan define kiya (Kyunke ab ye props se nahi aa rahi)
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planEditId, setPlanEditId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "",
    features: [],
    schoolLimit: "",
    interval: "month",
  });

  // 2. Data Fetch karne ka function
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/plans");
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Page load hote hi data mangwao
  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreate = () => {
    setPlanEditId(null);
    setPlanForm({
      name: "",
      price: "",
      features: [],
      schoolLimit: "",
      interval: "month",
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setPlanEditId(plan._id);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      features: plan.features || [],
      schoolLimit: plan.schoolLimit || "",
      interval: plan.interval || "month",
    });
    setIsPlanModalOpen(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = planEditId ? "PUT" : "POST";
    const payload = {
      ...planForm,
      id: planEditId,
      price: Number(planForm.price),
      schoolLimit: Number(planForm.schoolLimit),
    };

    const res = await fetch("/api/superadmin/plans", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsPlanModalOpen(false);
      fetchPlans();
    }
  };

  const handlePlanDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      const res = await fetch(`/api/superadmin/plans?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchPlans();
    }
  };

  // Loading state handling
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500">Loading Subscription Plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">All Plans</h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto bg-slate-900 text-white px-2 py-2 rounded-md flex items-center justify-center gap-1 text-sm hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <Plus size={18} /> New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 hover:gap-7 transition-all duration-300">
        {plans.map((plan: any) => (
          <div
            key={plan._id}
            className="group bg-white border border-slate-200 rounded-3xl p-4 relative flex flex-col hover:border-indigo-300 hover:shadow-xl transition-all duration-300"
            style={{
              transition: "all 0.3s ease-in-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(0,0,0,0.20)";
              e.currentTarget.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            <div className="absolute top-4 right-4 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {plan.interval === "month" ? "Monthly" : "Yearly"}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl text-slate-900 font-bold">
                  PKR {plan.price}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                  /{plan.interval}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3 mb-8 border-t border-slate-50 pt-6">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-green-50 px-3 py-2 rounded-md">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Up to {plan.schoolLimit} Students </span>
              </div>
              {plan.features?.slice(0, 3).map((f: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-500"
                >
                  <div className="w-1.5 h-1.5 rounded-md bg-slate-300" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenEdit(plan)}
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-md text-xs font-bold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 size={14} /> Edit Plan
              </button>
              <button
                onClick={() => handlePlanDelete(plan._id)}
                className="p-2.5 border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        formData={planForm}
        setFormData={setPlanForm}
        onSubmit={handlePlanSubmit}
        isEditing={!!planEditId}
      />
    </div>
  );
}
