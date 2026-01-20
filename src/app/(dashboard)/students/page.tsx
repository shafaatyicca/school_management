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
import StudentFormModal from "@/components/StudentFormModal";
import type { IStudent } from "@/models/Student";
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

export default function StudentsPage() {
  const [students, setStudents] = useState<IStudent[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
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
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    setFetchLoading(true);
    setError(null);
    try {
      console.log("Fetching students...");
      const response = await fetch("/api/students");
      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const data = await response.json();
      console.log("Students data:", data);

      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to fetch students");
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      console.log("Fetching classes...");
      const response = await fetch("/api/classes");
      const data = await response.json();
      console.log("Classes data:", data);

      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const method = selectedStudent ? "PUT" : "POST";
      const body = selectedStudent
        ? { id: selectedStudent._id, ...formData }
        : formData;

      const response = await fetch("/api/students", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }

      await fetchStudents();
      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error: any) {
      console.error("Error saving student:", error);
      alert(error.message || "Failed to save student");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (student: IStudent) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      await fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const openAddModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  if (fetchLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading students...</p>
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
            <Button onClick={fetchStudents}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-0 px-0">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-1xl font-bold">Students Management</h1>
        <Button onClick={openAddModal} className="cursor-pointer">
          <Plus />
          Add Student
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-gray-500"
                >
                  No students found. Click "Add Student" to create one.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student, index) => (
                <TableRow key={student._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {student.rollNumber}
                  </TableCell>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    {(student.classId as any)?.name || "N/A"}
                  </TableCell>
                  <TableCell>{student.section}</TableCell>
                  <TableCell>{student.guardianName}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        student.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {student.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        className="cursor-pointer"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="cursor-pointer"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteDialog({ open: true, id: student._id! })
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

      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleSubmit}
        student={selectedStudent}
        classes={classes}
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
              student record.
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
