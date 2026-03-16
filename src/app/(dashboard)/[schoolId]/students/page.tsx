"use client";

import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Box, Chip } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import StudentFormModal from "@/components/StudentFormModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import ParentFormModal from "@/components/ParentFormModal";
import { handleExportRows, handlePrintTable } from "@/lib/exportUtils";
import { calculateAge, calculateTenure, formatDate } from "@/lib/tenureUtils";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { useStudentModal } from "@/hooks/useStudentModal";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import {
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from "lucide-react";

export default function StudentsPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [viewingParent, setViewingParent] = useState<any>(null);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [isParentFormOpen, setIsParentFormOpen] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);

  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    if (!schoolId) return;
    setFetchLoading(true);
    try {
      const [stdRes, clsRes] = await Promise.all([
        fetch(`/api/students?schoolId=${schoolId}`),
        fetch(`/api/classes?schoolId=${schoolId}`),
      ]);
      const stdData = await stdRes.json();
      const clsData = await clsRes.json();
      setStudents(stdData);
      setClasses(clsData);
    } catch (error) {
      notify.error("Failed to fetch students data. Please try again.");
    } finally {
      setFetchLoading(false);
    }
  };

  const {
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
  } = useStudentModal(students, setStudents, schoolId);

  const handleOpenStudentFromParent = (studentData: any) => {
    openStudentProfile(studentData);
  };

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

  const handleDelete = async () => {
    if (!deleteDialog.id || !schoolId) return;
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}`, {
        method: "DELETE",
        body: JSON.stringify({ id: deleteDialog.id }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        notify.success("Student deleted successfully"); // Success Notification
        fetchData();
      } else {
        notify.error("Failed to delete student"); // Error Notification
      }
      setDeleteDialog({ open: false, id: null });
    } catch (error) {
      notify.error("Something went wrong during deletion");
      console.error("Delete failed");
    }
  };

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "S#",
        header: "S.No",
        enableSorting: false,
        enableColumnFilter: false,
        enableColumnDragging: false,
        enableColumnOrdering: false,
        size: 30,
        Cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {row.index + 1}
          </span>
        ),
      },
      {
        id: "image",
        header: "Photo",
        enableColumnDragging: false,
        enableColumnOrdering: false,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        size: 50,
        Cell: ({ row }) => {
          const image = row.original.image;
          const name = row.original.fullName;
          const displayImg =
            image ||
            (row.original.gender === "Female"
              ? "/studentfemale-avatar.jpg"
              : "/studentmale-avatar.jpg");

          return (
            <div
              className="flex items-center justify-center cursor-pointer"
              onClick={() => setOpenPhotoId(row.original._id?.toString())}
            >
              <img
                src={displayImg}
                alt={name}
                className="w-7 h-7 rounded-full object-cover hover:scale-110 transition-transform"
                style={{ border: "1px solid var(--border)" }}
              />
            </div>
          );
        },
      },
      {
        id: "studentName",
        header: "Student Name",
        accessorFn: (row) => `${row.fullName} (${row.grNumber})`,
        meta: {
          exportHeaders: ["GR#", "Student Name"],
          getExportValue: (row) => [
            row.grNumber || "---",
            row.fullName || "---",
          ],
        },
        size: 130,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => openStudentProfile(row.original)}
          >
            <span className=" text-[11px] font-mono text-slate-500 dark:text-slate-400 group-hover:underline">
              ({row.original.grNumber || "---"})
            </span>
            <span className="text-sky-600 dark:text-sky-400 group-hover:underline transition-all">
              {row.original.fullName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "parentId.fullName",
        header: "Father Name",
        size: 130,
        Cell: ({ row }) => {
          const parentData = row.original.parentId;

          return (
            <div
              className={`flex items-center gap-2 group transition-all ${
                parentData
                  ? "cursor-pointer text-sky-600 dark:text-sky-400"
                  : "text-slate-400 dark:text-slate-600"
              }`}
              onClick={() => {
                if (parentData) {
                  setViewingParent(parentData);
                  setIsParentModalOpen(true);
                }
              }}
            >
              <span className="group-hover:underline">
                {parentData?.fullName || "---"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "dateOfBirth",
        header: "D.O.B",
        size: 60,
        Cell: ({ cell }) => (
          <span className="text-slate-700 dark:text-slate-300">
            {formatDate(cell.getValue<any>(), "short")}
          </span>
        ),
      },
      {
        accessorKey: "parentId.address",
        header: "Address",
        size: 200,
        Cell: ({ row }) => {
          const address = row.original.parentId?.address;

          return (
            <div
              className="text-[11px] text-black-600 leading-tight"
              title={address || "No Address"}
            >
              {address ? (
                address.length > 50 ? (
                  `${address.substring(0, 50)}...`
                ) : (
                  address
                )
              ) : (
                <span className="text-stone-400">---</span>
              )}
            </div>
          );
        },
      },
      {
        id: "class_info",
        header: "Class",
        accessorFn: (row) =>
          `${(row.classId as any)?.name || "N/A"} (${row.section || ""})`,
        meta: {
          getExportValue: (row) =>
            `${(row.classId as any)?.name || "N/A"} (${row.section || ""})`,
        },
        size: 60,
        Cell: ({ row }) => {
          const className = (row.original.classId as any)?.name || "N/A";
          const section = row.original.section || "";

          return (
            <div className="flex items-center font-mono">
              <span className="text-black-800 text-[12px]">{className}</span>

              <span className="mx-0.5 text-black-400">-</span>

              <span className="text-pink-600 text-[12px]">({section})</span>
            </div>
          );
        },
      },
      {
        accessorKey: "bFormNumber",
        header: "B-Form / CNIC",
        size: 60,
        Cell: ({ cell }) => (
          <span className="text-[11px] font-mono text-black-600">
            {cell.getValue<string>() || "---"}
          </span>
        ),
      },

      {
        accessorKey: "enrollmentDate",
        header: "D.O.A",
        size: 50,
        Cell: ({ cell }) => (
          <span className="text-slate-700 dark:text-slate-300">
            {formatDate(cell.getValue<any>(), "short")}
          </span>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 40,
        Cell: ({ row }) => (
          <span className="text-[11px] text-black-600 font-medium">
            {row.original.gender}
          </span>
        ),
      },

      {
        accessorKey: "parentId.phone",
        header: "Contact#",
        size: 60,
        meta: {
          getExportValue: (row) => {
            const f = row.parentId?.phone || "";
            const m = row.motherPhone || "";
            return `F: ${f}${m ? ` \nM: ${m}` : ""}`;
          },
        },
        Cell: ({ row }) => (
          <div className="flex flex-col text-[11px]">
            <span className="text-black-700 font-medium">
              {row.original.parentId?.phone || "No Father Phone"}
            </span>
            <span className="text-pink-500 italic">
              {row.original.motherPhone || ""}
            </span>
          </div>
        ),
      },
      {
        id: "age",
        header: "Student Age",
        accessorFn: (row) => calculateAge(row.dateOfBirth),
        size: 100,
        Cell: ({ row }) => (
          <span className="text-[12px] text-slate-700">
            {calculateAge(row.original.dateOfBirth)}
          </span>
        ),
      },
      {
        id: "tenure",
        header: "Student Tenure",
        accessorFn: (row) =>
          calculateTenure(row.enrollmentDate, row.leavingDate, row.status),
        meta: {
          // Export mein simple text dikhane ke liye
          getExportValue: (row) =>
            calculateTenure(row.enrollmentDate, row.leavingDate, row.status),
        },
        size: 150,
        Cell: ({ row }) => {
          const tenure = calculateTenure(
            row.original.enrollmentDate,
            row.original.leavingDate,
            row.original.status,
          );

          return (
            <div className="flex flex-col">
              <span className="text-[12px] font-medium text-blue-600">
                {tenure}
              </span>
              <span className="text-[10px] text-slate-400 italic">
                Since joining
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "previousSchool",
        header: "Previous School",
        size: 100,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 40,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          return (
            <Chip
              label={status}
              color={status === "active" ? "success" : "error"}
              size="small"
              sx={{
                height: "20px",
                fontSize: "10px",
                textTransform: "capitalize",
                fontWeight: "bold",
              }}
            />
          );
        },
      },
      {
        accessorKey: "inactiveReason",
        header: "Remarks / Reason",
        size: 50,
        meta: {
          getExportValue: (row) =>
            row.status === "inactive"
              ? `Reason: ${row.inactiveReason || "Not specified"}`
              : row.detailedNote || "---",
        },
        Cell: ({ row }) => {
          const status = row.original.status;
          const reason = row.original.inactiveReason;
          const note = row.original.detailedNote;

          return (
            <div className="flex flex-col truncate">
              {status === "inactive" ? (
                <span className="text-[10px] text-red-500 italic font-medium">
                  Reason: {reason || "Not specified"}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 truncate">
                  {note || "---"}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [openStudentProfile],
  );

  const table = useMaterialReactTable({
    columns,
    data: students,
    state: { showProgressBars: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableDensityToggle: false, // Density toggle disable
    enableColumnActions: false, // 3 dots menu disable
    initialState: {
      density: "compact",
      columnVisibility: {
        "parentId.address": false,
        reason: false,
        inactiveReason: false,
        dateOfBirth: true,
        bFormNumber: false,
        gender: false,
        previousSchool: false,
        age: false,
        tenure: false,
      },
    },
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 50, header: "Actions" },
    },
    renderRowActions: ({ row }) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => {
            setSelectedStudent(row.original);
            setIsModalOpen(true);
          }}
        >
          <Pencil className="w-4 h-4 text-sky-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => setDeleteDialog({ open: true, id: row.original._id })}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex items-center gap-2 ">
        {/* Excel Button */}
        <Button
          onClick={() => handleExportRows(table, "excel", "Students Report")}
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-8 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>

        {/* PDF Button */}
        <Button
          onClick={() => handleExportRows(table, "pdf", "Students Report")}
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 h-8 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>

        {/* Print Button */}
        <Button
          onClick={() => handlePrintTable(table, "Students Report")}
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
        padding: "0px 10px",
      },
    },
    muiTableHeadCellProps: {
      sx: { fontWeight: "700", fontSize: "12px", py: 0.5 },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "12px",
        fontWeight: "500",
        py: 0.4,
      },
    },
  });

  return (
    <div className="space-y-2">
      <PageHeader
        title="Students Management"
        buttonLabel="Add Student"
        onButtonClick={() => {
          setSelectedStudent(null);
          setIsModalOpen(true);
        }}
      />
      <div className="border border-border rounded-xl shadow-sm bg-background overflow-hidden">
        <MaterialReactTable table={table} />
      </div>
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        student={selectedStudent}
        classes={classes}
        isLoading={isLoading}
        schoolId={schoolId}
      />
      <StudentProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={viewingStudent}
        onEdit={handleEditFromProfile}
      />
      <ParentProfileModal
        isOpen={isParentModalOpen}
        onClose={() => setIsParentModalOpen(false)}
        parent={viewingParent}
        onStudentClick={handleOpenStudentFromParent}
        onEdit={(parent) => {
          setViewingParent(parent);
          setIsParentFormOpen(true);
        }}
        schoolId={schoolId}
      />
      <ParentFormModal
        isOpen={isParentFormOpen}
        onClose={() => setIsParentFormOpen(false)}
        parent={viewingParent}
        isLoading={isParentLoading}
        schoolId={schoolId}
        onSubmit={async (data: any) => {
          setIsParentLoading(true);
          try {
            const res = await fetch(`/api/parents?schoolId=${schoolId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: viewingParent._id,
                ...data,
                schoolId,
              }),
            });
            if (res.ok) {
              notify.success("Parent details updated successfully");
              setViewingParent({ ...viewingParent, ...data }); // profile auto-update
              await fetchData();
              setIsParentFormOpen(false);
            } else {
              const err = await res.json();
              notify.error(err.message || "Failed to update parent details");
            }
          } catch (error) {
            notify.error("Network error. Please try again.");
          } finally {
            setIsParentLoading(false);
          }
        }}
      />
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
        onConfirm={handleDelete}
        itemName={
          deleteDialog.id
            ? students.find((s) => s._id === deleteDialog.id)?.fullName
            : ""
        }
      />
      {/* Picture Pop-up */}
      {openPhotoId &&
        (() => {
          const selectedStudent = students.find(
            (std: any) => std._id?.toString() === openPhotoId.toString(),
          );

          if (!selectedStudent) return null;

          const displayImg =
            (selectedStudent as any).image ||
            ((selectedStudent as any).gender === "Female"
              ? "/studentfemale-avatar.jpg"
              : "/studentmale-avatar.jpg");

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
                    className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 shadow-xl rounded-full p-1.5 text-slate-500 hover:text-red-500 transition-all border border-slate-100 hover:rotate-90 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="py-2 px-2 text-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    GR: {(selectedStudent as any).grNumber} {" | "}
                    {(selectedStudent as any).fullName}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
