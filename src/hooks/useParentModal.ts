"use client";

import { useState } from "react";

export function useParentModal(
  parents: any[],
  setParents: React.Dispatch<React.SetStateAction<any[]>>,
) {
  // Parent Profile
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  // Parent Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Student Profile
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  /* ────────────────────────────────────────────── */
  /* OPEN PROFILE */
  const openParentProfile = (parent: any) => {
    setSelectedParent(parent);
    setIsViewOpen(true);
  };

  /* OPEN STUDENT PROFILE */
  const openStudentProfile = (student: any) => {
    setSelectedStudent(student);
    setIsStudentViewOpen(true);
  };

  /* OPEN EDIT */
  const openEditParent = (parent: any) => {
    setSelectedParent(parent);
    setIsFormOpen(true);
  };

  /* ────────────────────────────────────────────── */
  /* SUBMIT FORM (ADD + EDIT) */
  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const method = selectedParent ? "PUT" : "POST";

      const res = await fetch("/api/parents", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedParent ? { id: selectedParent._id, ...data } : data,
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const updatedParent = await res.json();

      if (selectedParent) {
        // Update Table
        const id = selectedParent._id?.toString();

        setParents((prev) =>
          prev.map((p) => (p._id?.toString() === id ? updatedParent : p)),
        );

        // Update Profile Live
        setSelectedParent(updatedParent);
      } else {
        // Add New Parent Top of Table
        setParents((prev) => [updatedParent, ...prev]);
      }

      setIsFormOpen(false);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Parent Profile
    isViewOpen,
    setIsViewOpen,
    selectedParent,
    openParentProfile,

    // Form
    isFormOpen,
    setIsFormOpen,
    isLoading,
    handleSubmit,
    openEditParent,

    // Student Profile
    isStudentViewOpen,
    setIsStudentViewOpen,
    selectedStudent,
    openStudentProfile,
  };
}
