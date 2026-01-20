"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import TeacherFormModal from "@/components/TeacherFormModal";
import type { ITeacher } from "@/models/Teacher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<ITeacher | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setFetchLoading(true);
    setError(null);
    try {
      console.log("Fetching teachers...");
      const response = await fetch("/api/teachers");
      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const data = await response.json();
      console.log("Teachers data:", data);

      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setError("Failed to fetch teachers");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const method = selectedTeacher ? "PUT" : "POST";
      const body = selectedTeacher
        ? { id: selectedTeacher._id, ...formData }
        : formData;

      const response = await fetch("/api/teachers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }

      await fetchTeachers();
      setIsModalOpen(false);
      setSelectedTeacher(null);
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      alert(error.message || "Failed to save teacher");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (teacher: ITeacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/teachers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      await fetchTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert("Failed to delete teacher");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const openAddModal = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  if (fetchLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading teachers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg text-red-500 mb-4">{error}</p>
            <Button onClick={fetchTeachers}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-1xl font-bold">Teachers Management</h1>
        <Button onClick={openAddModal} className=" cursor-pointer">
          <Plus />
          Add Teacher
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-500"
                >
                  No teachers found. Click "Add Teacher" to create one.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher, index) => (
                <TableRow key={teacher._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell>{teacher.subject}</TableCell>
                  <TableCell>{teacher.experience} years</TableCell>
                  <TableCell>PKR {teacher.salary.toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        teacher.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {teacher.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        className="cursor-pointer"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(teacher)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="cursor-pointer"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteDialog({ open: true, id: teacher._id! })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TeacherFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTeacher(null);
        }}
        onSubmit={handleSubmit}
        teacher={selectedTeacher}
        isLoading={isLoading}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              teacher record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && handleDelete(deleteDialog.id)}
              className="bg-red-500 hover:bg-red-600 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
