"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { Box, IconButton, Chip } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import PageHeader from "@/components/PageHeader";
import StudentFormModal from "@/components/StudentFormModal";
import StudentProfileModal from "@/components/StudentProfileModal";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<any>(null);

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
        size: 50,
        enableResizing: false,
        Cell: ({ row }) => (
          <span className="text-gray-500 font-mono text-[11px]">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "grNumber",
        header: "GR#",
        size: 50,
        Cell: ({ cell }) => (
          <b className="text-blue-700">{cell.getValue<number>()}</b>
        ),
      },
      {
        accessorKey: "fullName",
        header: "Student Name",
        size: 130,
        Cell: ({ row }) => (
          <div
            className="font-semibold text-blue-600 hover:underline cursor-pointer leading-none"
            onClick={() => {
              setViewingStudent(row.original);
              setIsViewModalOpen(true);
            }}
          >
            {row.original.fullName}
          </div>
        ),
      },
      {
        accessorKey: "parentId.fullName",
        header: "Father Name",
        size: 130,
        Cell: ({ row }) => (
          <span className="text-slate-600">
            {row.original.parentId?.fullName || "---"}
          </span>
        ),
      },
      {
        accessorKey: "parentId.phone",
        header: "Father Phone",
        size: 120,
        Cell: ({ row }) => (
          <span className="text-slate-600">
            {row.original.parentId?.phone || "---"}
          </span>
        ),
      },
      {
        accessorKey: "dateOfBirth",
        header: "D.O.B",
        size: 80,
        Cell: ({ cell }) => {
          const d = cell.getValue<string>();
          return d
            ? new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(d))
            : "---";
        },
      },
      {
        accessorKey: "enrollmentDate",
        header: "Enrolled",
        size: 100,
        Cell: ({ cell }) => {
          const d = cell.getValue<string>();
          return d
            ? new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(d))
            : "---";
        },
      },
      {
        accessorFn: (row) => (row.classId as any)?.name || "N/A",
        id: "class",
        header: "Class",
        size: 90,
        Cell: ({ row }) => (
          <Chip
            label={`${(row.original.classId as any)?.name}-${row.original.section}`}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ height: "20px", fontSize: "10px" }}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 80,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<string>()}
            color={cell.getValue<string>() === "active" ? "success" : "error"}
            size="small"
            sx={{
              height: "18px",
              fontSize: "10px",
              textTransform: "capitalize",
            }}
          />
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: students,
    state: { isLoading: fetchLoading },
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 80, header: "Actions" },
    },

    // COMPACT DESIGN SETTINGS
    muiTableHeadCellProps: {
      sx: {
        padding: "4px 8px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "#f1f5f9",
      },
    },
    muiTableBodyCellProps: {
      sx: { padding: "2px 8px", fontSize: "12px" },
    },
    muiTableBodyRowProps: {
      sx: { height: "30px" },
    },

    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: "2px" }}>
        <IconButton
          size="small"
          onClick={() => {
            setSelectedStudent(row.original);
            setIsModalOpen(true);
          }}
        >
          <EditIcon fontSize="inherit" color="primary" />
        </IconButton>
        <IconButton size="small" onClick={() => handleDelete(row.original._id)}>
          <DeleteIcon fontSize="inherit" sx={{ color: "#ef4444" }} />
        </IconButton>
      </Box>
    ),
  });

  return (
    <>
      <div className="space-y-1">
        <PageHeader
          title="Students Management"
          buttonLabel="Add New Student"
          onButtonClick={() => {
            setSelectedStudent(null);
            setIsModalOpen(true);
          }}
        />

        <div className="border rounded-lg overflow-hidden shadow-sm">
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
      </div>
      <StudentProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={viewingStudent}
      />
    </>
  );
}
