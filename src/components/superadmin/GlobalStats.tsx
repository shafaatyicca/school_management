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
        className={`p-3 rounded-[1.2rem] border cursor-pointer ${themes[theme]}`}
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
        <div className="flex items-center justify-between mb-1.5 opacity-80">
          <div className="flex items-center gap-1.5">
            <Icon size={14} strokeWidth={2.5} />
            <span className="text-[11px] uppercase tracking-widest">
              {title}
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-inherit italic">
            {subText}
          </span>
        </div>
        <h3 className="text-2xl tracking-tighter tabular-nums">
          {loading && stats.totalSchools === 0 ? "..." : value.toLocaleString()}
        </h3>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
      <StatCard
        title="Total Schools"
        value={stats.totalSchools}
        icon={Building2}
        theme="indigo"
        subText="All"
      />
      <StatCard
        title="Active Schools"
        value={stats.activeSchools}
        icon={Activity}
        theme="emerald"
        subText="Live"
      />
      <StatCard
        title="Inactive Schools"
        value={stats.inactiveSchools}
        icon={ShieldAlert}
        theme="rose"
        subText="Expired"
      />
      <StatCard
        title="Total Students"
        value={stats.totalStudents}
        icon={GraduationCap}
        theme="sky"
        subText="All Students"
      />
      <StatCard
        title="Total Employees"
        value={stats.totalEmployees}
        icon={Briefcase}
        theme="amber"
        subText="All Emp"
      />
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        theme="indigo"
        subText="All Users"
      />
    </div>
  );
}
