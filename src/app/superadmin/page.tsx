"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import GlobalStats from "@/components/superadmin/GlobalStats";

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState([]);
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

  useEffect(() => {
    fetchSchools();
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        {/* GlobalStats ko data pass kar rahe hain stats calculate karne ke liye */}
        <GlobalStats refreshTrigger={schools} />
      </div>
    </div>
  );
}
