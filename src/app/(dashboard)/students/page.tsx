"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { Box, Chip } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import StudentFormModal from "@/components/StudentFormModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import ParentProfileModal from "@/components/ParentProfileModal";

import { Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<any>(null);

  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [viewingParent, setViewingParent] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [stdRes, clsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const stdData = await stdRes.json();
      const clsData = await clsRes.json();
      setStudents(stdData);
      setClasses(clsData);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleOpenStudentFromParent = (studentData: any) => {
    setViewingStudent(studentData);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await fetch("/api/students", {
          method: "DELETE",
          body: JSON.stringify({ id }),
          headers: { "Content-Type": "application/json" },
        });
        fetchData();
      } catch (error) {
        console.error("Delete failed");
      }
    }
  };

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        id: "sno",
        header: "S.No",
        size: 30,
        enableResizing: false,
        Cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {row.index + 1}
          </span>
        ),
      },

      {
        accessorKey: "fullName",
        header: "Student Info",
        size: 150,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => {
              setViewingStudent(row.original);
              setIsViewModalOpen(true);
            }}
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
        size: 150,
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
        accessorKey: "parentId.address",
        header: "Home Address",
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
        header: "Class & Section",
        size: 100,
        Cell: ({ row }) => {
          const className = (row.original.classId as any)?.name || "N/A";
          const section = row.original.section || "";

          return (
            <div className="flex items-center font-mono">
              <span className="font-bold text-black-800 text-[12px]">
                {className}
              </span>

              <span className="mx-0.5 text-black-400">-</span>

              <span className="font-bold text-pink-600 text-[12px]">
                ({section})
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "bFormNumber",
        header: "B-Form / CNIC",
        size: 130,
        Cell: ({ cell }) => (
          <span className="text-[11px] font-mono text-black-600">
            {cell.getValue<string>() || "---"}
          </span>
        ),
      },
      {
        accessorKey: "dateOfBirth",
        header: "D.O.B",
        size: 110,
        Cell: ({ cell }) => {
          const d = cell.getValue<string>();
          return d ? new Date(d).toLocaleDateString("en-GB") : "---";
        },
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 80,
        Cell: ({ row }) => (
          <span className="text-[11px] text-black-600 font-medium">
            {row.original.gender}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
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
        accessorKey: "parentId.phone",
        header: "Contact#",
        size: 120,
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
        accessorKey: "inactiveReason",
        header: "Remarks / Reason",
        size: 150,
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
    [setIsViewModalOpen, setIsParentModalOpen],
  );

  const table = useMaterialReactTable({
    columns,
    data: students,
    state: { isLoading: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableDensityToggle: true,
    initialState: {
      density: "compact",
      columnVisibility: {
        "parentId.address": false,
        reason: false,
        inactiveReason: false,
        dateOfBirth: false,
        bFormNumber: false,
        gender: false,
      },
    },
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 120, header: "Actions" },
    },
    renderRowActions: ({ row }) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-accent text-sky-500"
          onClick={() => {
            setSelectedStudent(row.original);
            setIsModalOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive/10 text-destructive"
          onClick={() => handleDelete(row.original._id)}
        >
          <Trash2 className="h-4 w-4" />
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
      sx: { fontWeight: "700", fontSize: "12px" },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "12px",
      },
    },
  });

  return (
    <div className="space-y-2">
      <PageHeader
        title="Students Management"
        buttonLabel="Add New Student"
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
        onSubmit={async (data: any) => {
          setIsLoading(true);
          const method = selectedStudent ? "PUT" : "POST";
          const res = await fetch("/api/students", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              selectedStudent ? { id: selectedStudent._id, ...data } : data,
            ),
          });
          if (res.ok) {
            await fetchData();
            setIsModalOpen(false);
          } else {
            const err = await res.json();
            alert("Error: " + err.message);
          }
          setIsLoading(false);
        }}
        student={selectedStudent}
        classes={classes}
        isLoading={isLoading}
      />

      <StudentProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={viewingStudent}
      />

      <ParentProfileModal
        isOpen={isParentModalOpen}
        onClose={() => setIsParentModalOpen(false)}
        parent={viewingParent}
        onStudentClick={handleOpenStudentFromParent}
      />
    </div>
  );
}
