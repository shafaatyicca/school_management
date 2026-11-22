"use client";

import { useState, useMemo } from "react";
import { Collapse } from "@mui/material";
import {
  ListChecks,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import TodoForm from "@/components/TodoForm";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import { WidgetCard, EmptyNote, timeAgo } from "./ui";

const MAX_ASSIGNEES = 5; // chips shown per task, the rest as "+N"

// Priority badge colours + order (Urgent first)
const PRIORITY: Record<string, { label: string; rank: number; cls: string }> = {
  urgent: {
    label: "Urgent",
    rank: 0,
    cls: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
  },
  high: {
    label: "High",
    rank: 1,
    cls: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400",
  },
  normal: { label: "Normal", rank: 2, cls: "" },
};
const rankOf = (t: any) => PRIORITY[t.priority]?.rank ?? 2;
const empLabel = (e: any) =>
  e ? `(${e.emp_id ?? "-"}) ${e.fullName}${e.designation ? ` (${e.designation})` : ""}` : "Removed employee";


const userLabel = (u: any) => (u ? `${u.name}${u.roleName ? ` (${u.roleName})` : ""}` : "Removed user");

export default function TasksWidget({
  todos,
  employees,
  users = [],
  isAdmin = true,
  schoolId,
  onChanged,
}: {
  todos: any[];
  employees: any[];
  users?: any[];
  isAdmin?: boolean;
  schoolId: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const empById = useMemo(() => new Map(employees.map((e) => [String(e._id), e])), [employees]);
  const userById = useMemo(() => new Map(users.map((u) => [String(u._id), u])), [users]);
  const activeEmployees = useMemo(() => employees.filter((e) => e.status !== "inactive"), [employees]);

    // Pending first → Urgent, High, Normal → newest first. Completed at the bottom.
  const sorted = useMemo(
    () =>
      [...todos].sort(
        (a, b) =>
          (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) ||
          rankOf(a) - rankOf(b) ||
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [todos],
  );

  // Mark done / pending (staff: own tasks only — checked by the API)
  const toggleStatus = async (todo: any) => {
    const id = String(todo._id);
    if (busyId) return;
    const next = todo.status === "completed" ? "pending" : "completed";
    setBusyId(id);
    try {
      const res = await fetch("/api/todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        notify.success(next === "completed" ? "Task completed" : "Task reopened");
        onChanged();
      } else {
        notify.error(data?.message || "Failed to update task");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch("/api/todo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleting._id, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        notify.success("Task deleted");
        onChanged();
      } else {
        notify.error(data?.message || "Failed to delete task");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <WidgetCard
        title={`${isAdmin ? "Tasks Assigned" : "My Tasks"} (${todos.length})`}
        icon={ListChecks}
        accent="emerald"
        bodyClass="p-0"
        action={
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 text-[10px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="rounded p-1 text-muted-foreground hover:bg-[color:var(--muted)] cursor-pointer"
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        }
      >
        <Collapse in={open}>
          {todos.length === 0 ? (
            <EmptyNote>No tasks yet.</EmptyNote>
          ) : (
            <ul>
              {sorted.map((todo) => {
                const id = String(todo._id);
                const done = todo.status === "completed";
                const busy = busyId === id;

                // Login users (violet) first, then employees (sky)
                const chips = [
                  ...(todo.assignedUsers || []).map((uid: any) => ({
                    kind: "user",
                    text: userLabel(userById.get(String(uid))),
                  })),
                  ...(todo.assignedTo || []).map((eid: any) => ({
                    kind: "employee",
                    text: empLabel(empById.get(String(eid))),
                  })),
                ];
                const shown = chips.slice(0, MAX_ASSIGNEES);
                const extra = chips.length - shown.length;
                const allNames = chips.map((c) => c.text).join(", ");

                return (
                  <li
                    key={id}
                    className="relative group flex gap-2.5 border-t px-4 py-2.5 first:border-t-0 hover:bg-[color:var(--muted)]/40"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Urgent + pending → red bar on the left */}
                    {todo.priority === "urgent" && !done && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
                    )}

                    {/* Status icon (click to mark done / pending) */}
                    <button
                      type="button"
                      onClick={() => toggleStatus(todo)}
                      disabled={busy}
                      title={done ? "Mark as pending" : "Mark as completed"}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-wait"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-amber-500 hover:text-emerald-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      {/* Title + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <p
                            className={`truncate text-[13px] font-semibold ${
                              done ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                            title={todo.title}
                          >
                            {todo.title}
                          </p>
                          {todo.priority && todo.priority !== "normal" && (
                            <span
                              className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                                PRIORITY[todo.priority]?.cls || ""
                              }`}
                            >
                              {PRIORITY[todo.priority]?.label || todo.priority}
                            </span>
                          )}
                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                              done
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}
                          >
                            {todo.status}
                          </span>
                        </div>

                        {/* Edit / delete (admins, on hover) */}
                        {isAdmin && (
                          <div className="-mt-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(todo);
                              setFormOpen(true);
                            }}
                            title="Edit task"
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-sky-500/15 dark:hover:text-sky-400 cursor-pointer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(todo)}
                            title="Delete task"
                            className="rounded-md p-1.5 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        )}
                      </div>

                      {/* Full description */}
                      {todo.description && (
                        <p className="mt-0.5 whitespace-pre-line break-words text-[12px] leading-snug text-muted-foreground">
                          {todo.description}
                        </p>
                      )}

                      {/* Admins: who it is assigned to. Staff: a clear "mark" button */}
                      {isAdmin ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1" title={allNames}>
                          {shown.map((c, i) => (
                            <span
                              key={i}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                c.kind === "user"
                                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                  : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                              }`}
                            >
                              {c.text}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="rounded-full bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              +{extra}
                            </span>
                          )}
                          {todo.createdAt && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              Added {timeAgo(todo.createdAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(todo)}
                            disabled={busy}
                            className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold disabled:opacity-60 cursor-pointer ${
                              done
                                ? "border-slate-200 text-muted-foreground hover:bg-[color:var(--muted)] dark:border-slate-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            }`}
                          >
                            {done ? "Reopen" : (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Mark as completed
                              </>
                            )}
                          </button>
                          {todo.createdAt && (
                            <span className="text-[10px] text-muted-foreground">Added {timeAgo(todo.createdAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Collapse>
      </WidgetCard>

      {isAdmin && (
        <>
          <TodoForm
            isOpen={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            employees={activeEmployees}
            users={users}
            onRefresh={onChanged}
            editData={editing}
            schoolId={schoolId}
          />

          <DeleteConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            onConfirm={handleDelete}
            itemName={deleting ? `the task "${deleting.title}"` : ""}
          />
        </>
      )}
    </>
  );
}