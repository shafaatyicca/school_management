"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Building2,
  Wallet,
  AlertCircle,
  GraduationCap,
  Clock,
  Plus,
  FileText,
  Crown,
  AlertTriangle,
  Banknote,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { notify } from "@/lib/notify";
import IncomeComposedChart from "@/components/superadmin/charts/IncomeComposedChart";
import YearlySummaryChart from "@/components/superadmin/charts/YearlySummaryChart";

const rs = (n: any) => `Rs ${Number(n || 0).toLocaleString("en-US")}`;
const pkDay = (d: any) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Karachi" })
    : "";

// Card with a header — fills the row height
function Card({ title, icon, right, children }: any) {
  return (
    <div className="h-full flex flex-col bg-white rounded-md border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-slate-700">
          {icon} {title}
        </h3>
        {right}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

const TILE: Record<string, string> = {
  slate: "bg-white border-slate-200 text-slate-700",
  emerald: "bg-emerald-50/60 border-emerald-200 text-emerald-700",
  rose: "bg-rose-50/60 border-rose-200 text-rose-700",
  sky: "bg-sky-50/60 border-sky-200 text-sky-700",
  amber: "bg-amber-50/60 border-amber-200 text-amber-700",
};

function Kpi({ title, value, sub, icon: Icon, theme, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full text-left p-3 rounded-md border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${TILE[theme]}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-80">
        <Icon size={14} /> {title}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] opacity-80">{sub}</div>
    </button>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/superadmin/dashboard").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/superadmin/stats/revenue").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([d, rev]) => {
        if (!d) notify.error("Dashboard Error", "Failed to load dashboard data");
        setData(d);
        if (Array.isArray(rev)) setRevenueData(rev as any);
      })
      .catch(() => notify.error("Dashboard Error", "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium italic">Loading Dashboard Stats...</p>
      </div>
    );
  }

  const k = data?.kpis || {};
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }).format(new Date()),
  );
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
  const maxPlan = Math.max(1, ...(data?.plans || []).map((p: any) => p.count));

  const quickBtn =
    "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap";

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Greeting + quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{greeting}, Super Admin</h2>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push("/superadmin/schools?add=1")} className={`${quickBtn} bg-slate-900 text-white hover:bg-indigo-600`}>
            <Plus size={14} /> Add School
          </button>
          <button onClick={() => router.push("/superadmin/invoices")} className={`${quickBtn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <FileText size={14} /> New Invoice
          </button>
          <button onClick={() => router.push("/superadmin/subscriptions")} className={`${quickBtn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <Crown size={14} /> Plans
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 items-stretch">
        <Kpi
          title="Schools"
          value={k.schools?.total ?? 0}
          sub={`${k.schools?.active ?? 0} active · ${k.schools?.inactive ?? 0} inactive`}
          icon={Building2}
          theme="slate"
          onClick={() => router.push("/superadmin/schools")}
        />
        <Kpi
          title={`Collected · ${String(data?.billingMonth || "").split(" ")[0]}`}
          value={rs(k.collected)}
          sub={`of ${rs(k.billed)} billed`}
          icon={Wallet}
          theme="emerald"
          onClick={() => router.push("/superadmin/collections")}
        />
        <Kpi
          title="Pending"
          value={rs(k.pending?.total)}
          sub={`${k.pending?.count ?? 0} unpaid invoice(s)`}
          icon={AlertCircle}
          theme="rose"
          onClick={() => router.push("/superadmin/invoices")}
        />
        <Kpi
          title="Students"
          value={Number(k.students || 0).toLocaleString()}
          sub={`${k.employees ?? 0} staff · ${k.users ?? 0} logins`}
          icon={GraduationCap}
          theme="sky"
        />
        <Kpi
          title="Expiring"
          value={k.expiring ?? 0}
          sub={`in the next 15 days`}
          icon={Clock}
          theme="amber"
          onClick={() => router.push("/superadmin/schools")}
        />
      </div>

      {/* Needs attention + Recent payments */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-stretch">
        <div className="lg:col-span-3">
          <Card
            title="Needs Attention"
            icon={<AlertTriangle size={14} className="text-amber-500" />}
            right={
              data?.attentionTotal > (data?.attention?.length || 0) ? (
                <span className="text-[11px] text-slate-400">
                  {data.attention.length} of {data.attentionTotal}
                </span>
              ) : null
            }
          >
            {data?.attention?.length ? (
              <div className="divide-y divide-slate-100">
                {data.attention.map((a: any, i: number) => {
                  const reason =
                    a.kind === "unpaid" ? (
                      <span className="text-rose-600">
                        Unpaid {rs(a.amount)} ({a.count})
                      </span>
                    ) : a.kind === "expired" ? (
                      <span className="text-rose-600">
                        {a.days !== null && a.days < 0 ? `Expired ${Math.abs(a.days)} day(s) ago` : "Inactive"}
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        {a.days === 0 ? "Expires today" : `Expires in ${a.days} day(s)`}
                      </span>
                    );
                  return (
                    <div key={`${a.schoolId}-${a.kind}-${i}`} className="flex items-center gap-3 py-2">
                      <span className="flex-1 min-w-0 truncate text-xs font-semibold text-slate-700 uppercase">{a.name}</span>
                      <span className="text-[11px] font-medium whitespace-nowrap">{reason}</span>
                      {a.kind === "unpaid" ? (
                        <button
                          onClick={() => router.push(`/superadmin/schools/${a.schoolId}`)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Invoices
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/superadmin/schools?edit=${a.schoolId}`)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Renew
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-1 py-6 text-xs text-slate-400">
                <CheckCircle2 size={22} className="text-emerald-400" />
                All good. Nothing needs attention.
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Recent Payments" icon={<Banknote size={14} className="text-emerald-500" />}>
            {data?.recentPayments?.length ? (
              <div className="divide-y divide-slate-100">
                {data.recentPayments.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700 uppercase">{p.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {pkDay(p.date)} · {p.invoiceNumber} {p.paymentNo && <span className="font-mono"> · {p.paymentNo}</span>}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">{rs(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No payments yet.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Charts (unchanged components) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 items-stretch">
        <div className="lg:col-span-7 [&>*]:h-full">
          <IncomeComposedChart />
        </div>
        <div className="lg:col-span-3 [&>*]:h-full">
          <YearlySummaryChart data={revenueData} />
        </div>
      </div>

      {/* Plans + Largest schools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        <Card title="Schools by Plan" icon={<Crown size={14} className="text-violet-500" />}>
          {data?.plans?.length ? (
            <div className="space-y-2.5">
              {data.plans.map((p: any) => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <span className="text-slate-500">{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.round((p.count / maxPlan) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-400">No schools yet.</p>
          )}
        </Card>

        <Card title="Largest Schools" icon={<Trophy size={14} className="text-sky-500" />}>
          {data?.topSchools?.length ? (
            <div className="divide-y divide-slate-100">
              {data.topSchools.map((s: any, i: number) => (
                <div key={s.schoolId} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-600">
                      {i + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-700 uppercase">{s.name}</span>
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {Number(s.students).toLocaleString()} students
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-400">No students yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}