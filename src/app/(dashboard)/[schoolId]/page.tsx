"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  LayoutDashboard,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Button, Collapse, IconButton, Tooltip } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import TodoForm from "@/components/TodoForm";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [todos, setTodos] = useState([]);
  const [editingTodo, setEditingTodo] = useState<any>(null);

  const params = useParams();
  const schoolId = params.schoolId;

  const { data: session } = useSession();
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [empRes, todoRes] = await Promise.all([
        fetch(`/api/employees?schoolId=${schoolId}`),
        fetch(`/api/todo?schoolId=${schoolId}`),
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
    fetchData();
  }, []);

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

  return (
    <div className="space-y-4 pb-4 bg-[#f8fafc] dark:bg-background min-h-screen font-sans transition-colors duration-300">
      {/* --- YAHAN SE ADD KAREIN --- */}
      {session?.user?.role === "super_admin" && (
        <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/superadmin")}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md text-[11px] font-bold transition-all border border-white/20"
            >
              <ArrowLeft size={14} /> Back to Super Admin
            </button>
            <div className="h-4 w-[1px] bg-white/30 ml-1" />
            <p className="text-[11px] font-medium tracking-wide">
              VIEWING MODE:{" "}
              <span className="text-amber-300">School ID {schoolId}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black bg-amber-400 text-indigo-900 px-2.5 py-1 rounded-full uppercase italic">
            <ShieldCheck size={12} /> Root Access
          </div>
        </div>
      )}
      {/* --- YAHAN TAK --- */}
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <PageHeader
          title="Admin Dashboard"
          icon={
            <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-muted-foreground" />
          }
        />
      </div>

      {/* Stats Cards - Added Left & Right Borders for Dark Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Total Students",
            value: "120",
            icon: GraduationCap,
            // Dark mode: Background card color, Border left/right blue, top/bottom faint border
            color:
              "bg-blue-600 dark:bg-card dark:border-x-4 dark:border-x-blue-600 dark:border-y dark:border-y-border dark:text-foreground dark:shadow-none",
          },
          {
            label: "Total Classes",
            value: "10",
            icon: BookOpen,
            color:
              "bg-emerald-600 dark:bg-card dark:border-x-4 dark:border-x-emerald-600 dark:border-y dark:border-y-border dark:text-foreground dark:shadow-none",
          },
          {
            label: "Total Teachers",
            value: "15",
            icon: Users,
            color:
              "bg-purple-600 dark:bg-card dark:border-x-4 dark:border-x-purple-600 dark:border-y dark:border-y-border dark:text-foreground dark:shadow-none",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            // "border-none" ko remove kar diya taaki custom borders nazar ayein
            className={`${stat.color} text-white shadow-sm transition-all`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white/80 dark:text-muted-foreground text-[10px] font-light tracking-wide uppercase">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-light">{stat.value}</h3>
              </div>
              <stat.icon className="w-8 h-8 opacity-20 dark:opacity-40 dark:text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks Section Header */}
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
            // Dark Mode Overrides
            ".dark &": {
              bgcolor: "var(--primary)",
              color: "var(--primary-foreground) !important",
              "&:hover": {
                bgcolor: "var(--primary)",
                opacity: 0.9,
              },
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
                        <p className="font-medium text-slate-700 dark:text-foreground text-[13px] ">
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
        schoolId={schoolId}
      />
    </div>
  );
}
