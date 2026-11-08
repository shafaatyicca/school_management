"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Chip, TextField } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import StudentFormModal from "@/components/StudentFormModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import ParentFormModal from "@/components/ParentFormModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import {
  handleExportRows,
  handlePrintTable,
  type ExportHeader,
} from "@/lib/exportUtils";
import { calculateAge, calculateTenure, formatDate } from "@/lib/tenureUtils";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { useStudentModal } from "@/hooks/useStudentModal";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import {
  Contact,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
  Filter,
} from "lucide-react";

const ALL = "all";
type StatusFilter = "active" | "inactive" | "all";

export default function StudentInformationPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  // Filters
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState(""); // "" = not selected, "all" = all classes
  const [section, setSection] = useState(ALL);
  const [status, setStatus] = useState<StatusFilter>("active");

  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Parent / photo modals (same as Students page)
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [viewingParent, setViewingParent] = useState<any>(null);
  const [isParentFormOpen, setIsParentFormOpen] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // Super admin: resolve school from subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const hostname = window.location.hostname;
    if (hostname.includes(".lvh.me") || hostname.includes(".localhost")) {
      fetch(`/api/superadmin/schools?slug=${hostname.split(".")[0]}`)
        .then((r) => r.json())
        .then((data) => data?._id && setViewSchoolId(data._id));
    }
  }, [isSuperAdmin]);

  // Classes + school info (for export header)
  useEffect(() => {
    if (!effectiveSchoolId) return;
    fetch(`/api/classes?schoolId=${effectiveSchoolId}`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => notify.error("Failed to load classes"));
    fetch(`/api/superadmin/schools?id=${effectiveSchoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchoolInfo(d))
      .catch(() => {});
  }, [effectiveSchoolId]);

  // Students of the selected class / section
  const loadStudents = useCallback(async () => {
    if (!effectiveSchoolId || !classId) return;
    setFetchLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: String(effectiveSchoolId) });
      if (classId !== ALL) {
        params.set("classId", classId);
        if (section !== ALL) params.set("section", section);
      }
      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      notify.error("Failed to load students");
    } finally {
      setFetchLoading(false);
    }
  }, [effectiveSchoolId, classId, section]);

  useEffect(() => {
    if (classId) loadStudents();
    else setStudents([]);
  }, [classId, loadStudents]);

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
  } = useStudentModal(students, setStudents, effectiveSchoolId);

  // ── Derived ──
  const selectedClass = classes.find((c) => String(c._id) === classId);
  const sections: string[] = (selectedClass?.sections || [])
    .map((s: any) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean);

  const counts = useMemo(
    () => ({
      active: students.filter((s) => s.status === "active").length,
      inactive: students.filter((s) => s.status === "inactive").length,
      all: students.length,
    }),
    [students],
  );

  const visibleStudents = useMemo(
    () => (status === "all" ? students : students.filter((s) => s.status === status)),
    [students, status],
  );

  const classLabel =
    classId === ALL
      ? "All Classes"
      : selectedClass
        ? `${selectedClass.name} (${section === ALL ? "All Sections" : section})`
        : "";

  const exportHeader: ExportHeader = {
    school: {
      name: schoolInfo?.name,
      address: schoolInfo?.address,
      logo: schoolInfo?.logo,
    },
    info: [
      { label: "Class", value: classLabel },
      { label: "Status", value: status.charAt(0).toUpperCase() + status.slice(1) },
      { label: "Total", value: visibleStudents.length },
    ],
  };

  // ── Actions ──
  const handleDelete = async () => {
    if (!deleteDialog.id || !effectiveSchoolId) return;
    try {
      const res = await fetch(`/api/students`, {
        method: "DELETE",
        body: JSON.stringify({ id: deleteDialog.id, schoolId: effectiveSchoolId }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        notify.success("Student deleted successfully");
        loadStudents();
      } else {
        notify.error("Failed to delete student");
      }
    } catch {
      notify.error("Something went wrong during deletion");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  // After edit: reload so status / class changes move the student correctly
  const handleSubmitAndReload = async (data: any) => {
    await handleFormSubmit(data);
    loadStudents();
  };

  // ── Columns (same as Students page) ──
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
          <span className="text-muted-foreground font-mono">{row.index + 1}</span>
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
          const displayImg =
            row.original.image ||
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
                alt={row.original.fullName}
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
          getExportValue: (row) => [row.grNumber || "---", row.fullName || "---"],
        },
        size: 130,
        Cell: ({ row }) => (
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => openStudentProfile(row.original)}
          >
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 group-hover:underline">
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
              <span className="group-hover:underline">{parentData?.fullName || "---"}</span>
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
        id: "class_info",
        header: "Class",
        accessorFn: (row) => `${(row.classId as any)?.name || "N/A"} (${row.section || ""})`,
        meta: {
          getExportValue: (row) =>
            `${(row.classId as any)?.name || "N/A"} (${row.section || ""})`,
        },
        size: 60,
        Cell: ({ row }) => (
          <div className="flex items-center font-mono">
            <span className="text-[12px]">{(row.original.classId as any)?.name || "N/A"}</span>
            <span className="mx-0.5">-</span>
            <span className="text-pink-600 text-[12px]">({row.original.section || ""})</span>
          </div>
        ),
      },
      {
        accessorKey: "bFormNumber",
        header: "B-Form / CNIC",
        size: 60,
        Cell: ({ cell }) => (
          <span className="text-[11px] font-mono">{cell.getValue<string>() || "---"}</span>
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
            <span className="font-medium">{row.original.parentId?.phone || "No Father Phone"}</span>
            <span className="text-pink-500 italic">{row.original.motherPhone || ""}</span>
          </div>
        ),
      },
      {
        id: "age",
        header: "Student Age",
        accessorFn: (row) => calculateAge(row.dateOfBirth),
        size: 100,
      },
      {
        id: "tenure",
        header: "Student Tenure",
        accessorFn: (row) => calculateTenure(row.enrollmentDate, row.leavingDate, row.status),
        meta: {
          getExportValue: (row) =>
            calculateTenure(row.enrollmentDate, row.leavingDate, row.status),
        },
        size: 150,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 40,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return (
            <Chip
              label={value}
              color={value === "active" ? "success" : "error"}
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
        Cell: ({ row }) =>
          row.original.status === "inactive" ? (
            <span className="text-[10px] text-red-500 italic font-medium">
              Reason: {row.original.inactiveReason || "Not specified"}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 truncate">
              {row.original.detailedNote || "---"}
            </span>
          ),
      },
    ],
    [openStudentProfile],
  );

  const table = useMaterialReactTable({
    columns,
    data: visibleStudents,
    state: { showProgressBars: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableDensityToggle: false,
    enableColumnActions: false,
    initialState: {
      density: "compact",
      pagination: { pageSize: 25, pageIndex: 0 },
      columnVisibility: {
        inactiveReason: false,
        bFormNumber: false,
        gender: false,
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
      <div className="flex items-center gap-2">
        <Button
          onClick={() =>
            handleExportRows(table, "excel", "Student Information Report", exportHeader)
          }
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-8 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button
          onClick={() =>
            handleExportRows(table, "pdf", "Student Information Report", exportHeader)
          }
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 h-8 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button
          onClick={() => handlePrintTable(table, "Student Information Report", exportHeader)}
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
    muiTableHeadCellProps: { sx: { fontWeight: "700", fontSize: "12px", py: 0.5 } },
    muiTableBodyCellProps: { sx: { fontSize: "12px", fontWeight: "500", py: 0.4 } },
  });

  // Status buttons
  const STATUS_BUTTONS: {
    key: StatusFilter;
    label: string;
    count: number;
    active: string;
  }[] = [
    {
      key: "active",
      label: "Active",
      count: counts.active,
      active: "bg-emerald-600 border-emerald-600 text-white",
    },
    {
      key: "inactive",
      label: "Inactive",
      count: counts.inactive,
      active: "bg-rose-600 border-rose-600 text-white",
    },
    {
      key: "all",
      label: "All",
      count: counts.all,
      active: "bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-900",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Student Information" icon={<Contact className="w-4 h-4" />} />

      {/* ── Filters ── */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <TextField
            select
            label="Class"
            size="small"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSection(ALL);
              setStatus("active");
            }}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 220 }}
          >
            <option value="">Select Class</option>
            <option value={ALL}>All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={String(c._id)}>
                {c.name}
              </option>
            ))}
          </TextField>

          <TextField
            select
            label="Section"
            size="small"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            disabled={!classId || classId === ALL}
            sx={{ minWidth: 180 }}
          >
            <option value={ALL}>All Sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </TextField>

          {/* Status buttons — only after a class is selected */}
          {classId && (
            <div className="flex items-center gap-2 sm:ml-auto">
              {STATUS_BUTTONS.map((b) => {
                const on = status === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setStatus(b.key)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 h-9 text-xs font-semibold transition-colors cursor-pointer ${
                      on ? b.active : "text-foreground hover:bg-[color:var(--muted)]"
                    }`}
                    style={on ? undefined : { borderColor: "var(--border)" }}
                  >
                    {b.label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${
                        on ? "bg-white/25" : ""
                      }`}
                      style={on ? undefined : { backgroundColor: "var(--muted)" }}
                    >
                      {b.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Table (only after a class is selected) ── */}
      {classId ? (
        <div className="border border-border rounded-xl shadow-sm bg-background overflow-hidden">
          <MaterialReactTable table={table} />
        </div>
      ) : (
        <div
          className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <Filter className="h-8 w-8" />
          Select a class to view students
        </div>
      )}

      {/* ── Modals (same as Students page) ── */}
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitAndReload}
        student={selectedStudent}
        classes={classes}
        isLoading={isLoading}
        schoolId={effectiveSchoolId}
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
        onStudentClick={(s: any) => openStudentProfile(s)}
        onEdit={(parent) => {
          setViewingParent(parent);
          setIsParentFormOpen(true);
        }}
        schoolId={effectiveSchoolId}
      />
      <ParentFormModal
        isOpen={isParentFormOpen}
        onClose={() => setIsParentFormOpen(false)}
        parent={viewingParent}
        isLoading={isParentLoading}
        schoolId={effectiveSchoolId}
        onSubmit={async (data: any) => {
          setIsParentLoading(true);
          try {
            const res = await fetch(`/api/parents`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: viewingParent._id, ...data, schoolId: effectiveSchoolId }),
            });
            if (res.ok) {
              notify.success("Parent details updated successfully");
              setViewingParent({ ...viewingParent, ...data });
              await loadStudents();
              setIsParentFormOpen(false);
            } else {
              const err = await res.json();
              notify.error(err.message || "Failed to update parent details");
            }
          } catch {
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
          deleteDialog.id ? students.find((s) => s._id === deleteDialog.id)?.fullName : ""
        }
      />

      {/* Photo popup */}
      {openPhotoId &&
        (() => {
          const s: any = students.find((std) => std._id?.toString() === openPhotoId);
          if (!s) return null;
          const displayImg =
            s.image ||
            (s.gender === "Female" ? "/studentfemale-avatar.jpg" : "/studentmale-avatar.jpg");
          return (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setOpenPhotoId(null)}
            >
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <div
                className="relative z-10 bg-white dark:bg-slate-900 p-1.5 rounded-md shadow-2xl w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={displayImg}
                    className="w-full h-72 object-cover rounded-md"
                    alt="Preview"
                  />
                  <button
                    onClick={() => setOpenPhotoId(null)}
                    className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 shadow-xl rounded-full p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="py-2 text-center text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">
                  GR: {s.grNumber} | {s.fullName}
                </p>
              </div>
            </div>
          );
        })()}
    </div>
  );
}