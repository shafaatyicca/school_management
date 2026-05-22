import { useState } from "react";
import { notify } from "@/lib/notify";

export function useStudentModal(
  students: any[],
  setStudents: React.Dispatch<React.SetStateAction<any[]>>,
  schoolId: string | undefined,
) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openStudentProfile = (student: any) => {
    setViewingStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditFromProfile = () => {
    setSelectedStudent(viewingStudent);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const method = selectedStudent ? "PUT" : "POST";
      const payload = selectedStudent
        ? { id: selectedStudent._id, ...data }
        : { ...data };
      const res = await fetch(`/api/students`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const updatedStudent = await res.json();

      if (selectedStudent) {
        const id = selectedStudent._id?.toString();
        setStudents((prev) =>
          prev.map((std) =>
            std._id?.toString() === id ? updatedStudent : std,
          ),
        );
        setViewingStudent(updatedStudent);
        notify.success("Student updated successfully");
      } else {
        setStudents((prev) => [updatedStudent, ...prev]);
        notify.success("Student registered successfully");
      }

      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error: any) {
      notify.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isViewModalOpen,
    setIsViewModalOpen,
    viewingStudent,
    openStudentProfile,
    handleEditFromProfile,
    isModalOpen,
    setIsModalOpen,
    selectedStudent,
    setSelectedStudent,
    isLoading,
    handleFormSubmit,
  };
}
