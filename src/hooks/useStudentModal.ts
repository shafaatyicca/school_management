import { useState } from "react";

export function useStudentModal(
  students: any[],
  setStudents: React.Dispatch<React.SetStateAction<any[]>>,
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
      const res = await fetch("/api/students", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedStudent ? { id: selectedStudent._id, ...data } : data,
        ),
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
        setViewingStudent((prev: any) =>
          prev?._id?.toString() === id ? updatedStudent : prev,
        );
      } else {
        setStudents((prev) => [updatedStudent, ...prev]);
      }

      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error: any) {
      alert("Error: " + error.message);
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
