"use client";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
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
} from "@mui/material";

export default function TodoForm({
  isOpen,
  onClose,
  employees = [],
  onRefresh,
  editData,
  schoolId,
}: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: [],
      status: "pending",
    },
  });

  // Jab Edit button dabayein to data form mein bhar jaye
  useEffect(() => {
    if (editData) {
      reset({
        title: editData.title,
        description: editData.description || "",
        assignedTo: editData.assignedTo.map((id: any) => String(id)),
        status: editData.status,
      });
    } else {
      reset({ title: "", description: "", assignedTo: [], status: "pending" });
    }
  }, [editData, reset, isOpen]);

  const selectedEmployees = watch("assignedTo");

  const onSubmit = async (data: any) => {
    const method = editData ? "PUT" : "POST";
    const body = editData
      ? { ...data, id: editData._id, schoolId }
      : { ...data, schoolId };

    const res = await fetch("/api/todo", {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      reset();
      onRefresh();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle className="font-bold border-b">
        {editData ? "Edit Task" : "Assign New Task"}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="flex flex-col gap-5 mt-2">
          <TextField
            {...register("title", { required: true })}
            label="Task Title"
            fullWidth
            size="small"
          />

          <TextField
            {...register("description")}
            label="Description (Optional)"
            multiline
            rows={2}
            fullWidth
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Select Employees</InputLabel>
            <Select
              multiple
              value={selectedEmployees}
              label="Select Employees"
              onChange={(e) => setValue("assignedTo", e.target.value as any)}
              renderValue={(selected: any) =>
                employees
                  .filter((emp: any) => selected.includes(String(emp._id)))
                  .map((emp: any) => emp.fullName)
                  .join(", ")
              }
            >
              {employees.length > 0 ? (
                employees.map((emp: any) => (
                  <MenuItem key={String(emp._id)} value={String(emp._id)}>
                    <Checkbox
                      checked={selectedEmployees.indexOf(String(emp._id)) > -1}
                    />
                    <span className="text-sm">
                      ({emp.emp_id}) {emp.fullName}
                    </span>
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No Employees Found</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Status Field (Sirf edit ke waqt kaam ayega) */}
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
            sx={{
              bgcolor: "#1e293b",
              py: 1,
              "&:hover": { bgcolor: "#334155" },
            }}
          >
            {editData ? "Update Task" : "Create Task"}
          </Button>
        </DialogContent>
      </form>
    </Dialog>
  );
}
