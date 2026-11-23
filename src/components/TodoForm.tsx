"use client";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  Button,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  Autocomplete,
} from "@mui/material";
import { notify } from "@/lib/notify";
import { toYMD } from "@/lib/pkTime";

type Option = { kind: "user" | "employee"; id: string; label: string };

export default function TodoForm({
  isOpen,
  onClose,
  employees = [],
  users = [],
  onRefresh,
  editData,
  schoolId,
}: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: [] as string[], // employees
      assignedUsers: [] as string[], // login users
      status: "pending",
      priority: "normal",
      deadline: "",
    },
  });

  const [saving, setSaving] = useState(false);

  // Fill the form when editing (empty for a new task)
  useEffect(() => {
    if (editData) {
      reset({
        title: editData.title,
        description: editData.description || "",
        assignedTo: (editData.assignedTo || []).map((a: any) => String(a?._id || a)),
        assignedUsers: (editData.assignedUsers || []).map((a: any) => String(a?._id || a)),
        status: editData.status,
        priority: editData.priority || "normal",
        deadline: editData.deadline ? toYMD(new Date(editData.deadline)) : "",
      });
    } else {
      reset({ title: "", description: "", assignedTo: [], assignedUsers: [], status: "pending", priority: "normal", deadline: "" });
    }
  }, [editData, reset, isOpen]);

  const selectedEmployees: string[] = watch("assignedTo") || [];
  const selectedUsers: string[] = watch("assignedUsers") || [];

  // One list, two groups: login users first, then employees
  const options: Option[] = [
    ...users
      .filter((u: any) => u.isActive !== false || selectedUsers.includes(String(u._id)))
      .map((u: any) => ({
        kind: "user" as const,
        id: String(u._id),
        label: `${u.name}${u.roleName ? ` (${u.roleName})` : ""}`,
      })),
    ...employees.map((e: any) => ({
      kind: "employee" as const,
      id: String(e._id),
      label: `${e.emp_id ? `(${e.emp_id}) ` : ""}${e.fullName || ""}${e.designation ? ` (${e.designation})` : ""}`,
    })),
  ];

  const selectedOptions = options.filter((o) =>
    (o.kind === "user" ? selectedUsers : selectedEmployees).includes(o.id),
  );

  const onSubmit = async (data: any) => {
    if (saving) return;
    if ((data.assignedTo?.length || 0) + (data.assignedUsers?.length || 0) === 0) {
      notify.error("Please select at least one person");
      return;
    }

    const method = editData ? "PUT" : "POST";
    const body = editData ? { ...data, id: editData._id, schoolId } : { ...data, schoolId };

    setSaving(true);
    try {
      const res = await fetch("/api/todo", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => null);

      if (res.ok) {
        notify.success(editData ? "Task updated" : "Task created");
        reset();
        onRefresh();
        onClose();
      } else {
        notify.error(result?.message || "Failed to save task");
      }
    } catch {
      notify.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className="border-b" sx={{ fontSize: "14px", fontWeight: 700, m: 1 }}>
        {editData ? "Edit Task" : "Assign New Task"}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="flex flex-col gap-5 mt-2">
          <TextField {...register("title", { required: true })} label="Task Title" fullWidth size="small" />

          <TextField {...register("description")} label="Description" multiline rows={8} fullWidth size="small" />

          {/* Login users + employees: type to search, or open the list with the arrow */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_160px]">
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            options={options}
            groupBy={(o: Option) => (o.kind === "user" ? "Administrator Users" : "Other Employees")}
            renderGroup={(params) => (
              <li key={params.key}>
                <div className="sticky -top-2 z-10 bg-sky-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:bg-slate-800 dark:text-sky-300">
                  {params.group}
                </div>
                <ul className="p-0">{params.children}</ul>
              </li>
            )}
            value={selectedOptions}
            onChange={(_, values: Option[]) => {
              setValue(
                "assignedUsers",
                values.filter((v) => v.kind === "user").map((v) => v.id),
                { shouldDirty: true },
              );
              setValue(
                "assignedTo",
                values.filter((v) => v.kind === "employee").map((v) => v.id),
                { shouldDirty: true },
              );
            }}
            getOptionLabel={(o: Option) => o.label}
            isOptionEqualToValue={(a: Option, b: Option) => a.kind === b.kind && a.id === b.id}
            limitTags={2}
            noOptionsText="No one found"
            renderOption={(props, o: Option, { selected }) => {
              const { key, ...optionProps } = props as any;
              return (
                <li key={key} {...optionProps}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} />
                  <span className="text-sm">{o.label}</span>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assign to"
                placeholder={selectedOptions.length ? "" : "Type a name or ID…"}
              />
            )}
          />

          {/* Priority */}
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={watch("priority")}
              label="Priority"
              onChange={(e) => setValue("priority", e.target.value as string)}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            {...register("deadline")}
            type="date"
            label="Due Date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          </div>

          {/* Status (only when editing) */}
          {editData && (
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                {...register("status")}
                value={watch("status")}
                label="Status"
                onChange={(e) => setValue("status", e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={saving}
            sx={{ bgcolor: "#1e293b", py: 1, "&:hover": { bgcolor: "#334155" } }}
          >
            {saving ? "Saving..." : editData ? "Update Task" : "Create Task"}
          </Button>
        </DialogContent>
      </form>
    </Dialog>
  );
}