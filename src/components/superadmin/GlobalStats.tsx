"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Building2,
  ShieldAlert,
  Activity,
  GraduationCap,
  Briefcase,
} from "lucide-react";

export default function GlobalStats({
  refreshTrigger,
}: {
  refreshTrigger?: any[];
}) {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    inactiveSchools: 0,
    totalStudents: 0,
    totalEmployees: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/stats");
      const result = await res.json();
      if (result.success) setStats(result.data);
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Jab bhi schools ki array change hogi (status toggle ya delete par), stats refresh honge
  useEffect(() => {
    fetchStats();
  }, [fetchStats, JSON.stringify(refreshTrigger)]);

  const StatCard = ({ title, value, icon: Icon, theme, subText }: any) => {
    const themes: any = {
      indigo: "bg-indigo-50/50 border-indigo-200 text-indigo-600",
      emerald: "bg-emerald-50/50 border-emerald-200 text-emerald-600",
      rose: "bg-rose-50/50 border-rose-200 text-rose-600",
      amber: "bg-amber-50/50 border-amber-200 text-amber-600",
      sky: "bg-sky-50/50 border-sky-200 text-sky-600",
    };

    return (
      <div
        className={`p-3 rounded-[1.2rem] border transition-all ${themes[theme]}`}
      >
        <div className="flex items-center justify-between mb-1.5 opacity-80">
          <div className="flex items-center gap-1.5">
            <Icon size={14} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {title}
            </span>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-inherit italic">
            {subText}
          </span>
        </div>
        <h3 className="text-2xl font-black tracking-tighter italic tabular-nums">
          {loading && stats.totalSchools === 0 ? "..." : value.toLocaleString()}
        </h3>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      <StatCard
        title="Network"
        value={stats.totalSchools}
        icon={Building2}
        theme="indigo"
        subText="Total"
      />
      <StatCard
        title="Online"
        value={stats.activeSchools}
        icon={Activity}
        theme="emerald"
        subText="Live"
      />
      <StatCard
        title="Alerts"
        value={stats.inactiveSchools}
        icon={ShieldAlert}
        theme="rose"
        subText="Off"
      />
      <StatCard
        title="Students"
        value={stats.totalStudents}
        icon={GraduationCap}
        theme="sky"
        subText="Std"
      />
      <StatCard
        title="Staff"
        value={stats.totalEmployees}
        icon={Briefcase}
        theme="amber"
        subText="Emp"
      />
      {/* Last Card - Refresh functionality removed and color changed to indigo */}
      <StatCard
        title="Impact"
        value={stats.totalUsers}
        icon={Users}
        theme="indigo"
        subText="Users"
      />
    </div>
  );
}
