"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import GlobalStats from "@/components/superadmin/GlobalStats";
import IncomeComposedChart from "@/components/superadmin/charts/IncomeComposedChart";
import YearlySummaryChart from "@/components/superadmin/charts/YearlySummaryChart";

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/superadmin/schools");
      const data = await res.json();
      setSchools(data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await fetch("/api/superadmin/stats/revenue");
      const data = await res.json();
      if (Array.isArray(data)) setRevenueData(data);
    } catch (error) {
      console.error("Failed to fetch revenue data:", error);
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium italic">
          Loading Dashboard Stats...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <GlobalStats refreshTrigger={schools} />
      </div>
      <div className="grid grid-cols-1  mb-1">
        <div className="flex gap-3 items-stretch">
          <div style={{ width: "70%" }}>
            <IncomeComposedChart />
          </div>
          <div style={{ width: "30%" }}>
            <YearlySummaryChart data={revenueData} />
          </div>
        </div>
      </div>
    </div>
  );
}
