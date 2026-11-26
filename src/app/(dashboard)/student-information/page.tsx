"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import StudentFormModal from "@/components/StudentFormModal";
import StudentProfileModal from "@/components/StudentProfileModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import ParentFormModal from "@/components/ParentFormModal";
import { type ExportHeader } from "@/lib/exportUtils";
import PageGuard from "@/components/PageGuard";
import ExportButtons from "@/components/ExportButtons";
import { usePermissions } from "@/components/PermissionsProvider";
import { showAccessDenied } from "@/lib/accessDenied";
import { calculateAge, calculateTenure, formatDate } from "@/lib/tenureUtils";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { useStudentModal } from "@/hooks/useStudentModal";
import { getSubdomain } from "@/lib/host";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { Contact, Pencil, Wallet, X, Filter } from "lucide-react";

const ALL = "all";
type StatusFilter = "active" | "inactive" | "all";

// Student Fee Ledger page (opens a student with ?student=<id>)
const LEDGER_PATH = "/student-fee-ledger";

// Small Cloudinary thumbnail (the full photo is not downloaded for a 28px avatar)
const thumb = (url: string, size = 64) =>
  url && url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace(
        "/upload/",
        `/upload/w_${size},h_${size},c_fill,g_face,f_auto,q_auto/`,
      )
    : url;

// Filter chip styles (same as the Parent Information page)
const CHIP =
  "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors cursor-pointer";
const CHIP_OFF =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10";
const CHIP_ON =
  "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300";
const SEC =
  "inline-flex h-6 items-center rounded-full px-3 text-[11px] font-medium transition-colors cursor-pointer";
const SEC_OFF =
  "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
const SEC_ON =
  "bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40";

function StudentInformationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  // Permissions (Edit belongs to the Students row, parent edit to Parents, ledger to Fees)
  const { can } = usePermissions();
  const canEditStudent = can("students", "edit");
  const canEditParent = can("parents", "edit");
  const canViewLedger = can("fees", "view");

  // Filters
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classId, setClassId] = useState("");
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

  // Super admin: resolve school from subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((data) => data?._id && setViewSchoolId(data._id));
    }
  }, [isSuperAdmin]);

  // Classes + school info (for export header)
  useEffect(() => {
    if (!effectiveSchoolId) return;
    setClassesLoading(true);
    fetch(`/api/classes?schoolId=${effectiveSchoolId}`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => notify.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
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
      const params = new URLSearchParams({
        schoolId: String(effectiveSchoolId),
      });
      if (classId !== ALL) {
        params.set("classId", classId);
        if (section !== ALL) params.set("section", section);
      }
      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) notify.error(data?.message || "Failed to load students");
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

  // Keeps the columns the same on every render (the table is not re-drawn on each click)
  const openProfileRef = useRef(openStudentProfile);
  useEffect(() => {
    openProfileRef.current = openStudentProfile;
  }, [openStudentProfile]);

  // Edit from the profile popups — blocked without permission
  const editStudentFromProfile = () => {
    if (!canEditStudent) {
      showAccessDenied("You don't have permission to edit students.");
      return;
    }
    handleEditFromProfile();
  };

  const editParentFromProfile = (parent: any) => {
    if (!canEditParent) {
      showAccessDenied("You don't have permission to edit parents.");
      return;
    }
    setViewingParent(parent);
    setIsParentFormOpen(true);
  };

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
    () =>
      status === "all" ? students : students.filter((s) => s.status === status),
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
      {
        label: "Status",
        value: status.charAt(0).toUpperCase() + status.slice(1),
      },
      { label: "Total", value: visibleStudents.length },
    ],
  };

  // Class chip: choose, or click again to clear
  const pickClass = (id: string) => {
    setClassId((prev) => (prev === id ? "" : id));
    setSection(ALL);
    setStatus("active");
  };

  // ── Actions ──
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
                src={thumb(displayImg)}
                alt={row.original.fullName}
                loading="lazy"
                decoding="async"
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
            onClick={() => openProfileRef.current(row.original)}
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
              className="text-[11px] leading-tight"
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
        Cell: ({ row }) => (
          <div className="flex items-center font-mono">
            <span className="text-[12px]">
              {(row.original.classId as any)?.name || "N/A"}
            </span>
            <span className="mx-0.5">-</span>
            <span className="text-pink-600 text-[12px]">
              ({row.original.section || ""})
            </span>
          </div>
        ),
      },
      {
        accessorKey: "bFormNumber",
        header: "B-Form / CNIC",
        size: 60,
        Cell: ({ cell }) => (
          <span className="text-[11px] font-mono">
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
          <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
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
            <span className="font-medium">
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
          <span className="text-[12px] text-slate-700 dark:text-slate-300">
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
          getExportValue: (row) =>
            calculateTenure(row.enrollmentDate, row.leavingDate, row.status),
        },
        size: 150,
        Cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-blue-600">
              {calculateTenure(
                row.original.enrollmentDate,
                row.original.leavingDate,
                row.original.status,
              )}
            </span>
            <span className="text-[10px] text-slate-400 italic">
              Since joining
            </span>
          </div>
        ),
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
          const value = cell.getValue<string>();
          return (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                value === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
              }`}
            >
              {value}
            </span>
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
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: visibleStudents,
    // First load: skeleton rows. Later loads: old rows stay + thin bar (no empty flash)
    state: {
      isLoading: fetchLoading && students.length === 0,
      showProgressBars: fetchLoading && students.length > 0,
    },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    muiPaginationProps: {
      rowsPerPageOptions: [
        { label: "25", value: 25 },
        { label: "50", value: 50 },
        { label: "75", value: 75 },
        { label: "100", value: 100 },
        { label: "All", value: 100000 },
      ],
    },
    enableDensityToggle: false,
    enableColumnActions: false,
    enableKeyboardShortcuts: false,
    initialState: {
      density: "compact",
      pagination: { pageSize: 25, pageIndex: 0 },
      columnVisibility: {
        "parentId.address": false,
        previousSchool: false,
        inactiveReason: false,
        bFormNumber: false,
        gender: false,
        age: false,
        tenure: false,
      },
    },
    // Actions column only when the user can edit students or open the ledger
    enableRowActions: canEditStudent || canViewLedger,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": { size: 50, header: "Actions" },
    },
    renderRowActions: ({ row }) => (
      <div className="flex gap-1">
        {canEditStudent && (
          <Button
            variant="ghost"
            size="icon"
            title="Edit Student"
            className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setSelectedStudent(row.original);
              setIsModalOpen(true);
            }}
          >
            <Pencil className="w-4 h-4 text-sky-500" />
          </Button>
        )}
        {/* Fee Ledger → "Student Fee Ledger → View" */}
        {canViewLedger && (
          <Button
            variant="ghost"
            size="icon"
            title="Fee Ledger"
            className="h-8 w-8 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() =>
              router.push(`${LEDGER_PATH}?student=${row.original._id}`)
            }
          >
            <Wallet className="h-4 w-4 text-emerald-600" />
          </Button>
        )}
      </div>
    ),
    // Export buttons (only with "Student Information → Export / Print")
    renderTopToolbarCustomActions: ({ table }) => (
      <ExportButtons
        table={table}
        module="studentInfo"
        title="Student Information Report"
        header={exportHeader}
      />
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: 0,
        border: "none",
        backgroundColor: "transparent",
        padding: "0px 10px",
      },
    },
    muiTableHeadCellProps: {
      sx: { fontWeight: "700", fontSize: "12px", py: 0.5 },
    },
    muiTableBodyCellProps: {
      sx: { fontSize: "12px", fontWeight: "500", py: 0.4 },
    },
  });

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
      active:
        "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300",
    },
    {
      key: "inactive",
      label: "Inactive",
      count: counts.inactive,
      active:
        "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-300",
    },
    {
      key: "all",
      label: "All",
      count: counts.all,
      active:
        "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-500/20 dark:border-slate-500/40 dark:text-slate-200",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Student Information"
        icon={<Contact className="w-4 h-4" />}
      />

      {/* ── Filters: class chips + section chips + status ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Class chips */}
        <div className="flex flex-wrap gap-1.5">
          {classesLoading ? (
            <span className="py-1.5 text-xs text-slate-400 dark:text-slate-500">
              Loading classes…
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => pickClass(ALL)}
                className={`${CHIP} ${classId === ALL ? CHIP_ON : CHIP_OFF}`}
              >
                All Classes
              </button>
              {classes.map((c) => {
                const id = String(c._id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickClass(id)}
                    className={`${CHIP} ${classId === id ? CHIP_ON : CHIP_OFF}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Section chips (one class) + status buttons — after a class is chosen */}
        {classId && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-200 pt-3 dark:border-slate-700">
            {classId !== ALL && (
              <>
                <span className="mr-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Section:
                </span>
                <button
                  type="button"
                  onClick={() => setSection(ALL)}
                  className={`${SEC} ${section === ALL ? SEC_ON : SEC_OFF}`}
                >
                  All
                </button>
                {sections.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={`${SEC} ${section === s ? SEC_ON : SEC_OFF}`}
                  >
                    {s}
                  </button>
                ))}
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              {STATUS_BUTTONS.map((b) => {
                const on = status === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setStatus(b.key)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 h-8 text-xs font-semibold transition-colors cursor-pointer ${
                      on
                        ? b.active
                        : "text-foreground hover:bg-[color:var(--muted)]"
                    }`}
                    style={on ? undefined : { borderColor: "var(--border)" }}
                  >
                    {b.label}
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-black/10 dark:bg-white/15" : ""}`}
                      style={
                        on ? undefined : { backgroundColor: "var(--muted)" }
                      }
                    >
                      {b.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Table (only after a class is selected) ── */}
      {classId ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <MaterialReactTable table={table} />
        </div>
      ) : (
        <div
          className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
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
        onEdit={editStudentFromProfile}
      />
      <ParentProfileModal
        isOpen={isParentModalOpen}
        onClose={() => setIsParentModalOpen(false)}
        parent={viewingParent}
        onStudentClick={(s: any) => openStudentProfile(s)}
        onEdit={editParentFromProfile}
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
              body: JSON.stringify({
                id: viewingParent._id,
                ...data,
                schoolId: effectiveSchoolId,
              }),
            });
            if (res.ok) {
              notify.success("Parent details updated successfully");
              setViewingParent({ ...viewingParent, ...data });
              await loadStudents();
              setIsParentFormOpen(false);
            } else {
              const err = await res.json().catch(() => null);
              notify.error(err?.message || "Failed to update parent details");
            }
          } catch {
            notify.error("Network error. Please try again.");
          } finally {
            setIsParentLoading(false);
          }
        }}
      />

      {/* Photo popup */}
      {openPhotoId &&
        (() => {
          const s: any = students.find(
            (std) => std._id?.toString() === openPhotoId,
          );
          if (!s) return null;
          const displayImg =
            s.image ||
            (s.gender === "Female"
              ? "/studentfemale-avatar.jpg"
              : "/studentmale-avatar.jpg");
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
                    src={thumb(displayImg, 600)}
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

// Guard: page opens only with "Student Information → View"
export default function Page() {
  return (
    <PageGuard module="studentInfo">
      <StudentInformationPage />
    </PageGuard>
  );
}
