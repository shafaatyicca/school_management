"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Collapse, IconButton } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import TodoForm from "@/components/TodoForm";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/schoolDashboard/StatsCard";
import {
  Users,
  LayoutDashboard,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  GraduationCap,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function DashboardPage() {
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [todos, setTodos] = useState([]);
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParents: 0,
    totalTeachers: 0,
    status: "active",
  });
  const [isInactive, setIsInactive] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState<{
    show: boolean;
    daysLeft: number;
    invoice: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Super Admin / School Admin check ───────────────────────────
  const isSuperAdmin = session?.user?.role === "super_admin";
  const schoolId = session?.user?.schoolId;

  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  // ── Redirect Logic ──────────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      if (session?.user?.role === "super_admin") {
        const hostname = window.location.hostname;
        const isSubdomain =
          hostname.includes(".lvh.me") || hostname.includes(".localhost");

        if (!isSubdomain) {
          router.push("/superadmin");
          return;
        }
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

  // ── NEW: Super Admin k liye slug se schoolId fetch karo ─────────
  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperAdmin) return;

    const hostname = window.location.hostname;
    const isSubdomain =
      hostname.includes(".lvh.me") || hostname.includes(".localhost");

    if (isSubdomain) {
      const slug = hostname.split(".")[0];
      fetch(`/api/superadmin/schools?slug=${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?._id) {
            setViewSchoolId(data._id);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, status]);

  // ── Fetch Employees & Todos ─────────────────────────────────────
  const fetchData = async () => {
    if (!effectiveSchoolId) return;
    try {
      const [empRes, todoRes] = await Promise.all([
        fetch(`/api/employees?schoolId=${effectiveSchoolId}`),
        fetch(
          `/api/todo${effectiveSchoolId ? `?schoolId=${effectiveSchoolId}` : ""}`,
        ),
      ]);
      const empData = await empRes.json();
      const todoData = await todoRes.json();
      if (Array.isArray(empData)) setEmployees(empData);
      if (todoData.success) setTodos(todoData.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (effectiveSchoolId) fetchData();
  }, [effectiveSchoolId]); // ← effectiveSchoolId use ho raha hai

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (status === "loading" || !effectiveSchoolId) return;

      try {
        const [statsRes, invRes] = await Promise.all([
          fetch(`/api/schoolStats?schoolId=${effectiveSchoolId}`),
          fetch(`/api/superadmin/invoices?schoolId=${effectiveSchoolId}`),
        ]);
        const statsData = await statsRes.json();
        const invoices = await invRes.json();
        setStats(statsData);

        const isSchoolAdminRole =
          session?.user?.role === "admin" ||
          session?.user?.role === "school_admin";

        if (!isSchoolAdminRole || !Array.isArray(invoices)) return;

        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

        const pendingInvoices = invoices.filter(
          (inv: any) => inv.status.toLowerCase() === "pending",
        );

        if (pendingInvoices.length === 0) return;

        const latestPending = pendingInvoices.reduce((latest: any, inv: any) =>
          new Date(inv.dueDate) > new Date(latest.dueDate) ? inv : latest,
        );

        const toKarachiMidnight = (d: Date) => {
          const s = d.toLocaleString("en-US", { timeZone: "Asia/Karachi" });
          const p = new Date(s);
          p.setHours(0, 0, 0, 0);
          return p;
        };
        const nowPKT = toKarachiMidnight(new Date());
        const latestDuePKT = toKarachiMidnight(new Date(latestPending.dueDate));

        // Suspend: due date aaj ya pehle
        if (latestDuePKT <= nowPKT) {
          setIsInactive(true);
          return;
        }

        // Warning: 5 din ya kam bache
        const diff = latestDuePKT.getTime() - nowPKT.getTime();
        if (diff > 0 && diff <= FIVE_DAYS_MS) {
          const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
          const dismissedKey = `warning_dismissed_${latestPending._id}_${latestPending.dueDate}`;
          if (!sessionStorage.getItem(dismissedKey)) {
            setPaymentWarning({ show: true, daysLeft, invoice: latestPending });
          }
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [effectiveSchoolId, session, status]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch("/api/todo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = (todo: any) => {
    setEditingTodo(todo);
    setIsTodoModalOpen(true);
  };

  // ── Loading Screen ──────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 text-sm font-medium italic">
          Verifying your dashboard access...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 bg-[#f8fafc] dark:bg-background min-h-screen font-sans transition-colors duration-300">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <PageHeader
          title="Admin Dashboard"
          icon={
            <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-muted-foreground" />
          }
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total Students"
          value={loading ? "..." : stats.totalStudents}
          icon={GraduationCap}
          variant="sky"
          className="dark:border-x-4 dark:border-x-blue-600"
        />
        <StatsCard
          title="Total Parents"
          value={loading ? "..." : stats.totalParents}
          icon={UserCheck}
          variant="emerald"
          className="dark:border-x-4 dark:border-x-emerald-600"
        />
        <StatsCard
          title="Total Teachers"
          value={loading ? "..." : stats.totalTeachers}
          icon={Users}
          variant="rose"
          className="dark:border-x-4 dark:border-x-purple-600 dark:border-y-border"
        />
      </div>

      {/* Tasks Section */}
      <div className="flex justify-between items-center px-1">
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h2 className="text-md font-medium text-slate-800 dark:text-foreground">
            Assign Tasks
          </h2>
          {isCollapsed ? (
            <ChevronDown
              size={20}
              className="text-slate-400 dark:text-slate-200"
            />
          ) : (
            <ChevronUp
              size={20}
              className="text-slate-400 dark:text-slate-200"
            />
          )}
        </div>

        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={14} />}
          onClick={() => {
            setEditingTodo(null);
            setIsTodoModalOpen(true);
          }}
          sx={{
            bgcolor: "#1e293b",
            color: "#ffffff",
            textTransform: "none",
            fontWeight: "500",
            fontSize: "11px",
            borderRadius: "6px",
            px: 1.5,
            height: "30px",
            boxShadow: "none",
            "&:hover": { bgcolor: "#334155", boxShadow: "none" },
            ".dark &": {
              bgcolor: "var(--primary)",
              color: "var(--primary-foreground) !important",
              "&:hover": { bgcolor: "var(--primary)", opacity: 0.9 },
            },
          }}
        >
          New Task
        </Button>
      </div>

      <Collapse in={!isCollapsed}>
        <div className="space-y-1.5">
          {todos.length === 0 ? (
            <Card className="border-dashed border border-slate-200 dark:border-border bg-transparent shadow-none">
              <CardContent className="px-4 text-center text-slate-400 dark:text-muted-foreground text-xs italic">
                No tasks found.
              </CardContent>
            </Card>
          ) : (
            todos.map((todo: any) => (
              <Card
                key={todo._id}
                className="border border-slate-100 dark:border-border bg-white dark:bg-card shadow-sm hover:shadow dark:hover:bg-accent/10 transition-all group overflow-hidden py-1.5"
              >
                <CardContent className="p-0">
                  <div className="px-3 py-1 flex justify-between items-center min-h-[44px]">
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-slate-700 dark:text-foreground text-[13px]">
                          {todo.title}
                        </p>
                        <span
                          className={`text-[8px] px-1.5 py-1 rounded font-bold border uppercase ${
                            todo.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                              : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          }`}
                        >
                          {todo.status}
                        </span>
                      </div>

                      {todo.description && (
                        <p className="text-[12px] text-slate-400 dark:text-muted-foreground font-light italic py-1">
                          {todo.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-0.5">
                        {todo.assignedTo.map((id: string) => {
                          const emp = employees.find(
                            (e: any) => String(e._id) === String(id),
                          );
                          return (
                            <span
                              key={id}
                              className="text-[10px] text-blue-500 dark:text-blue-400 font-medium"
                            >
                              {emp
                                ? `(${emp.emp_id}) ${emp.fullName}`
                                : "Unknown"}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(todo)}
                        sx={{
                          color: "var(--muted-foreground)",
                          "&:hover": { color: "var(--primary)" },
                        }}
                      >
                        <Edit size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(todo._id)}
                        sx={{ color: "var(--destructive)" }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Collapse>

      <TodoForm
        isOpen={isTodoModalOpen}
        onClose={() => {
          setIsTodoModalOpen(false);
          setEditingTodo(null);
        }}
        employees={employees}
        onRefresh={fetchData}
        editData={editingTodo}
        schoolId={effectiveSchoolId} // ← effectiveSchoolId
      />
      {/* ↓ YEH NAYA WARNING MODAL ADD KARO */}
      {paymentWarning?.show && !isInactive && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-card p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-4 border-amber-500 animate-in zoom-in duration-300">
            <div className="bg-amber-100 dark:bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-amber-500 dark:text-amber-400 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Payment Due Soon
            </h2>
            <p className="text-slate-500 dark:text-muted-foreground text-sm mb-4 leading-relaxed">
              Aapka payment{" "}
              <strong className="text-amber-600">
                {paymentWarning.daysLeft} din
              </strong>{" "}
              mein due hai. Baraaye meharbani waqt par payment karein warna
              account suspend ho jayega.
            </p>

            {/* Invoice detail */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6 text-left space-y-1.5">
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
                  {new Date(paymentWarning.invoice.dueDate).toLocaleDateString(
                    "en-PK",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
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
              Theek hai, yaad hai mujhe
            </Button>
          </div>
        </div>
      )}
      {/* Inactive Account Modal */}
      {isInactive && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-card p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-4 border-rose-600 animate-in zoom-in duration-300">
            <div className="bg-rose-100 dark:bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-rose-600 dark:text-rose-400 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 italic">
              Account Suspended
            </h2>
            <p className="text-slate-500 dark:text-muted-foreground text-sm mb-8 leading-relaxed">
              {session?.user?.role === "super_admin"
                ? "VIEWING MODE: This school is restricted due to inactivity or unpaid dues."
                : "Aapka account suspend kar diya gaya hai. Shayad aapki fees pending hai ya subscription expire ho chuki hai. Mazeed maloomat ke liye rabta karein."}
            </p>
            <Button
              variant="contained"
              fullWidth
              onClick={() =>
                session?.user?.role === "super_admin"
                  ? (window.location.href = "http://lvh.me:3000/superadmin")
                  : router.push("/login")
              }
              sx={{
                bgcolor: "#e11d48",
                borderRadius: "12px",
                py: 1.5,
                textTransform: "none",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#be123c" },
              }}
            >
              {session?.user?.role === "super_admin"
                ? "Back to Super Admin Panel"
                : "Sign Out & Go Back"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
