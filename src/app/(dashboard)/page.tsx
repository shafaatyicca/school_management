"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import {
  LayoutDashboard,
  ShieldCheck,
  TriangleAlert,
  LayoutTemplate,
  RotateCcw,
  Save,
  X,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { notify } from "@/lib/notify";
import { mergeLayout, defaultLayout, type LayoutItem } from "@/lib/dashboardLayout";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import SchoolTotals from "@/components/dashboard/SchoolTotals";
import FeeCollection from "@/components/dashboard/FeeCollection";
import RecentPayments from "@/components/dashboard/RecentPayments";
import Birthdays from "@/components/dashboard/Birthdays";
import Admissions from "@/components/dashboard/Admissions";
import LoginActivity from "@/components/dashboard/LoginActivity";
import MyActivity from "@/components/dashboard/MyActivity";
import TasksWidget from "@/components/dashboard/TasksWidget";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isSchoolAdminRole =
    session?.user?.role === "school_admin" || session?.user?.role === "admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : session?.user?.schoolId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Customize mode
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LayoutItem[]>([]);
  const [savingLayout, setSavingLayout] = useState(false);

  // School Admin: subscription warning / suspension
  const [isInactive, setIsInactive] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState<{
    show: boolean;
    daysLeft: number;
    invoice: any;
  } | null>(null);

  // ── Redirect logic (unchanged) ──────────────────────────────
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role === "super_admin") {
        const hostname = window.location.hostname;
        const isSubdomain = hostname.includes(".lvh.me") || hostname.includes(".localhost");
        if (!isSubdomain) router.push("/superadmin");
        return;
      }

      const hostname = window.location.hostname;
      const isLocalhost = hostname.includes("localhost");
      const schoolSlug = session?.user?.schoolSlug;
      if (!schoolSlug) return;

      const currentSubdomain = hostname.split(".")[0];
      const isCorrectSubdomain = isLocalhost
        ? currentSubdomain === schoolSlug
        : hostname.startsWith(`${schoolSlug}.`);

      if (!isCorrectSubdomain) {
        window.location.href = isLocalhost
          ? `http://${schoolSlug}.localhost:3000`
          : `https://${schoolSlug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN}`;
      }
    }
  }, [status, session, router]);

  // ── Super Admin: school _id from the subdomain ──────────────
  useEffect(() => {
    if (status === "loading" || !isSuperAdmin) return;
    const hostname = window.location.hostname;
    if (hostname.includes(".lvh.me") || hostname.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${hostname.split(".")[0]}&fields=basic`)
        .then((r) => r.json())
        .then((d) => (d?._id ? setViewSchoolId(d._id) : setLoading(false)))
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, status]);

  // ── Dashboard data (only the allowed widgets come back) ─────
  const load = useCallback(async () => {
    if (!effectiveSchoolId) return;
    try {
      const res = await fetch(`/api/dashboard?schoolId=${effectiveSchoolId}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message || "Failed to load dashboard");
        return;
      }
      setData(json);
      setError("");
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fresh numbers when the user comes back to the tab
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // ── School Admin: subscription payment warning (unchanged logic) ──
  useEffect(() => {
    if (status !== "authenticated" || !isSchoolAdminRole || !effectiveSchoolId) return;

    fetch(`/api/superadmin/invoices?schoolId=${effectiveSchoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((invoices) => {
        if (!Array.isArray(invoices)) return;

        const pending = invoices.filter((inv: any) => String(inv.status).toLowerCase() === "pending");
        if (pending.length === 0) return;

        const latest = pending.reduce((a: any, b: any) =>
          new Date(b.dueDate) > new Date(a.dueDate) ? b : a,
        );

        const toKarachiMidnight = (d: Date) => {
          const p = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
          p.setHours(0, 0, 0, 0);
          return p;
        };
        const now = toKarachiMidnight(new Date());
        const due = toKarachiMidnight(new Date(latest.dueDate));

        if (due <= now) {
          setIsInactive(true);
          return;
        }

        const diff = due.getTime() - now.getTime();
        const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
        if (diff > 0 && diff <= FIVE_DAYS) {
          const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
          const key = `warning_dismissed_${latest._id}_${latest.dueDate}`;
          if (!sessionStorage.getItem(key)) {
            setPaymentWarning({ show: true, daysLeft, invoice: latest });
          }
        }
      })
      .catch(() => {});
  }, [status, isSchoolAdminRole, effectiveSchoolId]);

  // ── Loading screen ──────
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="text-sm font-medium italic text-slate-500">Verifying your dashboard access...</p>
      </div>
    );
  }
  // ── Blocks this user has (only allowed widgets arrive from the API) ──
  const w = data?.widgets || {};
  const blocks: Record<string, React.ReactNode> = {};
  if (data) {
    blocks.welcome = <WelcomeCard me={data.me} />;
    if (w.schoolTotals) blocks.schoolTotals = <SchoolTotals data={w.schoolTotals} />;
    if (w.feeToday) blocks.feeToday = <FeeCollection data={w.feeToday} />;
    if (w.recentPayments) blocks.recentPayments = <RecentPayments data={w.recentPayments} />;
    if (w.birthdays) blocks.birthdays = <Birthdays data={w.birthdays} />;
    if (w.admissions) blocks.admissions = <Admissions data={w.admissions} />;
    if (w.loginActivity) blocks.loginActivity = <LoginActivity data={w.loginActivity} />;
    if (!data.isAdmin) blocks.myActivity = <MyActivity data={data.myActivity} />;
    if (data.tasks) {
      blocks.tasks = (
        <TasksWidget
          todos={data.tasks.todos || []}
          employees={data.tasks.employees || []}
          users={data.tasks.users || []}
          isAdmin={!!data.isAdmin}
          schoolId={effectiveSchoolId || null}
          onChanged={load}
        />
      );
    }
  }
  const available = Object.keys(blocks);
  const items = editing ? draft : mergeLayout(data?.layout, available);

  // ── Customize actions ──
  const startEditing = () => {
    setDraft(mergeLayout(data?.layout, available));
    setEditing(true);
  };

  const saveLayout = async () => {
    setSavingLayout(true);
    try {
      const res = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: effectiveSchoolId, items: draft }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(json?.message || "Failed to save layout");
        return;
      }
      setData((d: any) => ({ ...d, layout: json?.items || draft }));
      setEditing(false);
      notify.success("Dashboard layout saved");
    } catch {
      notify.error("Something went wrong");
    } finally {
      setSavingLayout(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard className="h-4 w-4" />}
        rightContent={
          data && !editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 cursor-pointer"
            >
              <LayoutTemplate className="h-3.5 w-3.5" /> Customize Dashboard
            </button>
          ) : null
        }
      />

      {/* Customize bar */}
      {editing && (
        <div className="sticky top-14 z-40 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 shadow-sm dark:border-sky-500/30 dark:bg-slate-900">
          <p className="text-xs font-medium text-sky-800 dark:text-sky-300">
            Drag <b>⠿</b> to move widgets, choose a size, then Save.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(defaultLayout(available))}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground hover:bg-[color:var(--muted)] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={savingLayout}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground hover:bg-[color:var(--muted)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={saveLayout}
              disabled={savingLayout}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
            >
              {savingLayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save layout
            </button>
          </div>
        </div>
      )}

      {/* Super Admin viewing a suspended school: a banner, never a lock */}
      {isSuperAdmin && data?.school?.status === "inactive" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          This school is suspended. You are viewing it as Super Admin.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading || !data ? (
        // Skeleton
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-[color:var(--muted)]" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-[color:var(--muted)]" />
            ))}
          </div>
        </div>
      ) : (
        <DashboardGrid items={items} blocks={blocks} editing={editing} onChange={setDraft} />
      )}

      {/* Subscription warning (School Admin) */}
      {paymentWarning?.show && !isInactive && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border-t-4 border-amber-500 bg-white p-8 text-center shadow-2xl animate-in zoom-in duration-300 dark:bg-card">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
              <ShieldCheck className="h-10 w-10 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">Payment Due Soon</h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
              Your subscription payment is due in{" "}
              <strong className="text-amber-600">
                {paymentWarning.daysLeft} day{paymentWarning.daysLeft > 1 ? "s" : ""}
              </strong>
              . Please pay on time to avoid suspension of your account.
            </p>

            <div className="mb-6 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-500/20 dark:bg-amber-500/10">
              {paymentWarning.invoice?.invoiceNumber && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Invoice #</span>
                  <span className="font-medium text-slate-700 dark:text-white">
                    {paymentWarning.invoice.invoiceNumber}
                  </span>
                </div>
              )}
              {paymentWarning.invoice?.amount && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-medium text-slate-700 dark:text-white">
                    Rs. {Number(paymentWarning.invoice.amount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Due Date</span>
                <span className="font-medium text-amber-600">
                  {new Date(paymentWarning.invoice.dueDate).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                sessionStorage.setItem(
                  `warning_dismissed_${paymentWarning.invoice._id}_${paymentWarning.invoice.dueDate}`,
                  "true",
                );
                setPaymentWarning(null);
              }}
              sx={{
                borderRadius: "12px",
                py: 1.2,
                textTransform: "none",
                color: "#64748b",
                borderColor: "#e2e8f0",
                "&:hover": { bgcolor: "#f8fafc" },
              }}
            >
              OK, I&apos;ll remember
            </Button>
          </div>
        </div>
      )}

      {/* Suspended (school users only — the Super Admin sees the banner above) */}
      {isInactive && !isSuperAdmin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border-t-4 border-rose-600 bg-white p-8 text-center shadow-2xl animate-in zoom-in duration-300 dark:bg-card">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
              <ShieldCheck className="h-10 w-10 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold italic text-slate-800 dark:text-white">Account Suspended</h2>
            <p className="mb-8 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
              Your account has been suspended, possibly because a payment is pending or the subscription
              has expired. Please contact us for more information.
            </p>
            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push("/login")}
              sx={{
                bgcolor: "#e11d48",
                borderRadius: "12px",
                py: 1.5,
                textTransform: "none",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#be123c" },
              }}
            >
              Sign Out &amp; Go Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}