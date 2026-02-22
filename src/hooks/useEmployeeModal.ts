import { useState } from "react";
import type { IEmployee } from "@/models/Employee";

export function useEmployeeModal(
  employees: IEmployee[],
  setEmployees: React.Dispatch<React.SetStateAction<IEmployee[]>>,
) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const openEmployeeProfile = (staff: IEmployee) => {
    setViewingStaff(staff);
    setIsViewModalOpen(true);
  };

  const handleEditFromProfile = () => {
    setSelectedEmployee(viewingStaff);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const method = selectedEmployee ? "PUT" : "POST";
      const res = await fetch("/api/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedEmployee ? { id: selectedEmployee._id, ...data } : data,
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      const json = await res.json();
      const updatedEmployee = json.value || json;

      if (selectedEmployee) {
        const id = selectedEmployee._id?.toString();
        setEmployees((prev) =>
          prev.map((emp) =>
            emp._id?.toString() === id ? updatedEmployee : emp,
          ),
        );
        // Profile update — selectedEmployee se compare karo
        setViewingStaff((prev: any) =>
          prev?._id?.toString() === id ? updatedEmployee : prev,
        );
      } else {
        setEmployees((prev) => [updatedEmployee, ...prev]);
      }

      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isViewModalOpen,
    setIsViewModalOpen,
    viewingStaff,
    openEmployeeProfile,
    handleEditFromProfile,
    isModalOpen,
    setIsModalOpen,
    selectedEmployee,
    setSelectedEmployee,
    isLoading,
    handleFormSubmit,
  };
}
