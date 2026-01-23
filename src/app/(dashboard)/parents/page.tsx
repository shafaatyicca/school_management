"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import PageHeader from "@/components/PageHeader";
import ParentFormModal from "@/components/ParentFormModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import StudentProfileModal from "@/components/StudentProfileModal"; // 1. Student Modal Import kiya

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Modals States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  // 2. Student Modal ke liye nayi states
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/parents");
      const data = await res.json();
      setParents(data);
    } catch (error) {
      console.error("Failed to fetch parents:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this parent? This may affect linked students.",
      )
    ) {
      try {
        await fetch("/api/parents", {
          method: "DELETE",
          body: JSON.stringify({ id }),
          headers: { "Content-Type": "application/json" },
        });
        fetchParents();
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
        accessorKey: "fullName",
        header: "Parent Name",
        size: 200,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-2 cursor-pointer hover:underline group"
            onClick={() => {
              setSelectedParent(row.original);
              setIsViewOpen(true);
            }}
          >
            <span className="text-gray-400 font-mono text-[11px] group-hover:text-blue-500">
              ({row.original.p_id})
            </span>
            <span className="text-blue-600 group-hover:text-blue-600">
              {row.original.fullName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "cnic",
        header: "CNIC",
        size: 130,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        size: 120,
      },
      {
        accessorKey: "email",
        header: "System Email",
        size: 200,
        Cell: ({ cell }) => (
          <span className="text-xs text-gray-500">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "occupation",
        header: "Occupation",
        size: 120,
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: parents,
    state: { isLoading: fetchLoading },
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 120, header: "Actions" },
    },
    muiTableHeadCellProps: {
      sx: {
        padding: "4px 8px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "#f8fafc",
      },
    },
    muiTableBodyCellProps: {
      sx: { padding: "6px 8px", fontSize: "12px" },
    },

    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: "4px" }}>
        <Tooltip title="View Profile">
          <IconButton
            size="small"
            onClick={() => {
              setSelectedParent(row.original);
              setIsViewOpen(true);
            }}
          >
            <ViewIcon fontSize="inherit" className="text-slate-500" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              setSelectedParent(row.original);
              setIsFormOpen(true);
            }}
          >
            <EditIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() => handleDelete(row.original._id)}
          >
            <DeleteIcon fontSize="inherit" sx={{ color: "#ef4444" }} />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  });

  return (
    <div className="space-y-1">
      <PageHeader
        title="Parents Management"
        buttonLabel="Add Parent"
        onButtonClick={() => {
          setSelectedParent(null);
          setIsFormOpen(true);
        }}
      />

      <div className="border rounded-xl shadow-sm bg-white overflow-hidden">
        <MaterialReactTable table={table} />
      </div>

      {/* Add/Edit Modal */}
      <ParentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        parent={selectedParent}
        isLoading={isLoading}
        onSubmit={async (data: any) => {
          setIsLoading(true);
          const method = selectedParent ? "PUT" : "POST";
          const res = await fetch("/api/parents", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              selectedParent ? { id: selectedParent._id, ...data } : data,
            ),
          });

          if (res.ok) {
            await fetchParents();
            setIsFormOpen(false);
          } else {
            const err = await res.json();
            alert("Error: " + err.message);
          }
          setIsLoading(false);
        }}
      />

      {/* Profile View Modal */}
      <ParentProfileModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        parent={selectedParent}
        onStudentClick={(student) => {
          // 3. Yahan Student data set hoga aur modal khulega
          setSelectedStudent(student);
          setIsStudentViewOpen(true);
        }}
      />

      {/* 4. Student Profile Modal Render kiya */}
      <StudentProfileModal
        isOpen={isStudentViewOpen}
        onClose={() => setIsStudentViewOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}
