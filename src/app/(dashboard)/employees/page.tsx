"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users } from "lucide-react";
import EmployeeFormModal from "@/components/EmployeeFormModal";
import PageHeader from "@/components/PageHeader";
import type { IEmployee } from "@/models/Employee";
import { FileSpreadsheet, FileText, Printer, X } from "lucide-react";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import EmployeeProfileModal from "@/components/EmployeeProfileModal";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(
    null,
  );
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | number | null;
  }>({
    open: false,
    id: null,
  });

  // For Staff Profile Modal
  const [viewingStaff, setViewingStaff] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      setError("Failed to fetch employees");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      const method = selectedEmployee ? "PUT" : "POST";
      const body = selectedEmployee
        ? { id: selectedEmployee._id, ...formData }
        : formData;

      const response = await fetch("/api/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong");
      }
      await fetchEmployees();
      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      alert(error.message || "Failed to save employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (employee: IEmployee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }), // state se id lein
      });
      if (!response.ok) throw new Error("Failed to delete");
      await fetchEmployees();
    } catch (error) {
      alert("Failed to delete employee");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const openAddModal = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  // --- MRT COLUMNS DEFINITION ---
  const columns = useMemo<MRT_ColumnDef<IEmployee>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        size: 50,
        Cell: ({ row }) => (
          <span className="text-foreground">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: "image",
        header: "Photo",
        size: 80,
        Cell: ({ row }) => {
          const imgSrc =
            row.original.image ||
            (row.original.gender === "female"
              ? "/female-avatar.jpg"
              : "/male-avatar.jpg");
          return (
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPhotoId(row.id); // Id set karein taake overlay khule
                }}
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden hover:scale-110 transition-transform cursor-pointer"
              >
                <img
                  src={imgSrc}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </button>
            </div>
          );
        },
      },
      {
        id: "employee_info",
        header: "Employee Details",
        meta: {
          exportHeaders: ["E-ID", "Full Name"],
          getExportValue: (row) => [row.emp_id || "---", row.fullName || "---"],
        },
        size: 150,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={() => {
              setViewingStaff(row.original);
              setIsViewModalOpen(true);
            }}
          >
            <span className="font-mono text-slate-500 dark:text-slate-400 group-hover:underline">
              ({row.original.emp_id || "---"})
            </span>
            <span className="text-sky-600 dark:text-sky-400 group-hover:underline transition-all">
              {row.original.fullName}
            </span>
          </div>
        ),
      },
      // {
      //   accessorKey: "email",
      //   header: "Email",
      //   size: 200,
      // },
      // {
      //   accessorKey: "password",
      //   header: "Password",
      //   size: 100,
      // },
      // {
      //   accessorKey: "role",
      //   header: "Role",
      //   size: 100,
      //   Cell: ({ cell }) => (
      //     <span className="capitalize">{cell.getValue<string>()}</span>
      //   ),
      // },
      {
        accessorKey: "phone",
        header: "Phone",
        size: 90,
      },
      {
        accessorKey: "nicNumber",
        header: "NIC",
        size: 90,
      },
      {
        accessorKey: "dateOfBirth",
        header: "DOB",
        size: 90,
        Cell: ({ cell }) => {
          const date = cell.getValue<any>();
          if (!date) return "---";

          return (
            <span className="text-slate-700 dark:text-slate-300">
              {new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(date))}
            </span>
          );
        },
      },
      {
        accessorKey: "staffCategory",
        header: "Category",
        size: 90,
        Cell: ({ cell }) => {
          const cat = cell.getValue<string>();
          return (
            <span className=" font-medium text-slate-700 dark:text-slate-300 capitalize">
              {cat || "---"}
            </span>
          );
        },
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 90,
        Cell: ({ cell }) => (
          <span className="capitalize">{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "salary",
        header: "Salary",
        size: 90,
        Cell: ({ cell }) => (
          <span className="font-mono font-bold text-green-600 dark:text-green-400">
            PKR {cell.getValue<number>()?.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "qualification",
        header: "Qualification",
        size: 90,
      },
      {
        accessorKey: "designation",
        header: "Designation",
        size: 90,
      },
      {
        accessorKey: "address",
        header: "Address",
        size: 200,
        Cell: ({ cell }) => (
          <div
            className="capitalize truncate max-w-[180px] print:whitespace-normal print:max-w-none"
            title={cell.getValue<string>()}
          >
            {cell.getValue<string>() || "---"}
          </div>
        ),
      },
      {
        accessorKey: "experience",
        header: "Experience",
        size: 100,
        Cell: ({ cell }) => {
          const exp = cell.getValue<number>();
          return <span className="font-medium">{exp || 0} Years</span>;
        },
      },

      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const isActive = status === "active";

          return (
            <span
              className={`
          inline-flex items-center justify-center
          px-2.5 py-0.5 
          rounded-full text-[10px] font-bold 
          tracking-wide shadow-sm
          ${isActive ? "bg-green-600 text-white" : "bg-red-600 text-white"}
        `}
              style={{
                height: "20px",
                fontSize: "10px",
                textTransform: "capitalize",
              }}
            >
              {status}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: employees,
    state: { showProgressBars: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    initialState: {
      density: "compact",
      columnVisibility: {
        nicNumber: true,
        status: true,
        phone: true,
        dateOfBirth: true,
        gender: false,
        salary: false,
        // email: false,
        // password: false,
        // role: false,
        qualification: false,
        designation: false,
        experience: false,
        address: false,
      },
    },
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEdit(row.original)}
          className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4 text-sky-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialog({ open: true, id: row.original._id! })}
          className="h-8 w-8 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),

    // --- Export Buttons Add  ---
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleExportRows(table, "excel", "Employees List")}
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>

        <Button
          onClick={() => handleExportRows(table, "pdf", "Employees List")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>

        <Button
          onClick={() => handlePrintTable(table, "Employees List")}
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 h-8 cursor-pointer dark:text-slate-200"
        >
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "16px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        padding: " 0px 10px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: "700",
        fontSize: "12px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "12px",
        fontWeight: "500",
        color: "var(--foreground)",
      },
    },
  });

  return (
    <div className="container mx-auto space-y-2">
      <PageHeader
        title="Employees Management"
        buttonLabel="Add Employee"
        onButtonClick={openAddModal}
        icon={<Users className="w-3.5 h-3.5" />}
      />
      <div className="w-full border border-border rounded-xl shadow-sm bg-background overflow-hidden">
        <MaterialReactTable table={table} />
      </div>
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSubmit={handleSubmit}
        employee={selectedEmployee}
        isLoading={isLoading}
      />
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName="Employee"
      />
      <EmployeeProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        staff={viewingStaff}
      />

      {/* Picture Pop-up */}
      {openPhotoId &&
        (() => {
          // .toString() use karein taake comparison ka masla khatam ho jaye
          const selectedEmp = employees.find(
            (emp) => emp._id?.toString() === openPhotoId.toString(),
          );

          if (!selectedEmp) return null;

          const displayImg =
            selectedEmp.image ||
            (selectedEmp.gender === "female"
              ? "/female-avatar.jpg"
              : "/male-avatar.jpg");

          return (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300"
              onClick={() => setOpenPhotoId(null)}
            >
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

              <div
                className="relative z-10 bg-white dark:bg-slate-900 p-1.5 rounded-[2.5rem] shadow-2xl border border-white/20 animate-in zoom-in duration-300 w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={displayImg}
                    className="w-full h-72 object-cover rounded-[2.2rem] shadow-inner border border-slate-100 dark:border-slate-800"
                    alt="Preview"
                  />

                  <button
                    onClick={() => setOpenPhotoId(null)}
                    className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 shadow-xl rounded-full p-1.5 text-slate-500 hover:text-red-500 transition-all border border-slate-100 hover:rotate-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-4 px-2 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                    Staff Preview
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {selectedEmp.fullName}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
