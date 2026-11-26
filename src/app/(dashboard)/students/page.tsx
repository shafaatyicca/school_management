"use client";

import { useSession } from "next-auth/react";
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
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { useStudentModal } from "@/hooks/useStudentModal";
import { getSubdomain } from "@/lib/host";
import { toYMD } from "@/lib/pkTime";
import DateRangePicker from "@/components/DateRangePicker";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { Pencil, Trash2, X, CalendarDays, User, UserRound } from "lucide-react";

// ── Admission filter ──
type Mode = "last30" | "month" | "3months" | "session" | "custom";

const MODES: { key: Mode; label: string }[] = [
  { key: "last30", label: "Last 30" },
  { key: "month", label: "This Month" },
  { key: "3months", label: "Last 3 Months" },
  { key: "session", label: "This Session" },
  { key: "custom", label: "Custom" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortMonth = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] || ym;
const ymLabel = (ym: string) => `${shortMonth(ym)} ${ym.slice(0, 4)}`; // "Nov 2026"
const ymCard = (ym: string) => `${shortMonth(ym)}-${ym.slice(0, 4)}`; // "Nov-2026"

// Date range of a preset (Pakistan time). "This Session" = current year for now.
function rangeFor(mode: Mode): { from: string; to: string } | null {
  const today = toYMD();
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (mode === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (mode === "3months") {
    const d = new Date(Date.UTC(y, m - 1 - 2, 1));
    return { from: d.toISOString().slice(0, 10), to: today };
  }
  if (mode === "session") return { from: `${y}-01-01`, to: today };
  return null;
}

// Every month between two YYYY-MM-DD dates → ["2026-08", "2026-09", ...]
function monthsBetween(from: string, to: string): string[] {
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const ey = Number(to.slice(0, 4));
  const em = Number(to.slice(5, 7));
  const out: string[] = [];
  while ((y < ey || (y === ey && m <= em)) && out.length < 120) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

// Admission month of a student → "2026-11"
const monthOf = (s: any) => (s?.enrollmentDate ? toYMD(new Date(s.enrollmentDate)).slice(0, 7) : "");
// Small Cloudinary thumbnail (the full photo is not downloaded for a 28px avatar)
const thumb = (url: string, size = 64) =>
  url && url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,g_face,f_auto,q_auto/`)
    : url;
// Last-30 list kept for this browser tab → the page opens instantly next time
const cacheKey = (sid: string) => `students_last30_v1_${sid}`;

// Month card styles
const CARD_ON =
  "border-orange-400 bg-orange-200 text-orange-800 ring-2 ring-orange-300 dark:border-orange-400 dark:bg-orange-500/30 dark:text-orange-100 dark:ring-orange-500/40";
const CARD =
  "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20";
const CARD_EMPTY =
  "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500";
const COUNT_BADGE =
  "rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300";

function StudentsPage() {
  const { data: session } = useSession();
  const schoolId = session?.user?.schoolId;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [viewSchoolId, setViewSchoolId] = useState<string | null>(null);
  const effectiveSchoolId = isSuperAdmin ? viewSchoolId : schoolId;

  // Permissions ("Add Student (Students)" row; parent edit → Parents row)
  const { can } = usePermissions();
  const canCreateStudent = can("students", "create");
  const canEditStudent = can("students", "edit");
  const canDeleteStudent = can("students", "delete");
  const canEditParent = can("parents", "edit");

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [viewingParent, setViewingParent] = useState<any>(null);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [isParentFormOpen, setIsParentFormOpen] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Admission filter
  const [mode, setMode] = useState<Mode>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(toYMD());
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const range =
    mode === "custom"
      ? customFrom && customTo && customFrom <= customTo
        ? { from: customFrom, to: customTo }
        : null
      : rangeFor(mode);
  const rFrom = range?.from || "";
  const rTo = range?.to || "";

  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((data) => {
          if (data?._id) setViewSchoolId(data._id);
        });
    }
  }, [isSuperAdmin]);

  // Classes (for the student form)
  useEffect(() => {
    if (!effectiveSchoolId) return;
    fetch(`/api/classes?schoolId=${effectiveSchoolId}`)
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId || fetchLoading || schoolInfo) return;
    fetch(`/api/superadmin/schools?id=${effectiveSchoolId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchoolInfo(d))
      .catch(() => {});
  }, [effectiveSchoolId, fetchLoading, schoolInfo]);

  // Students: latest 30 admissions, or admissions in the date range
    // Show the saved list at once (fresh data replaces it a moment later)
  useEffect(() => {
    if (!effectiveSchoolId) return;
    try {
      const raw = sessionStorage.getItem(cacheKey(String(effectiveSchoolId)));
      if (raw) setStudents((prev) => (prev.length ? prev : JSON.parse(raw)));
    } catch {}
  }, [effectiveSchoolId]);

  const fetchData = useCallback(async () => {
    if (!effectiveSchoolId) return;
    if (mode !== "last30" && !rFrom) return; // custom: wait for valid dates
    setFetchLoading(true);
    try {
      const params = new URLSearchParams({ schoolId: String(effectiveSchoolId) });
      if (mode === "last30") params.set("limit", "30");
      else {
        params.set("from", rFrom);
        params.set("to", rTo);
      }
      if (!includeInactive) params.set("status", "active");

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) notify.error(data?.message || "Failed to load students");
           const list = Array.isArray(data) ? data : [];
      setStudents(list);
      // Save the default view (without passwords) for a quick open next time
      if (res.ok && mode === "last30" && !includeInactive) {
        try {
          sessionStorage.setItem(
            cacheKey(String(effectiveSchoolId)),
            JSON.stringify(list.map(({ password, ...s }: any) => s)),
          );
        } catch {}
      }
    } catch (error) {
      notify.error("Failed to fetch students data. Please try again.");
    } finally {
      setFetchLoading(false);
    }
  }, [effectiveSchoolId, mode, rFrom, rTo, includeInactive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // New range / status → month selection cleared
  useEffect(() => {
    setSelectedMonth(null);
  }, [mode, rFrom, rTo, includeInactive]);

  // Month cards (not shown for "Last 30")
  const monthCards = useMemo(() => {
    if (mode === "last30" || !rFrom) return [];
    const cnt = new Map<string, number>();
    for (const s of students) {
      const k = monthOf(s);
      if (k) cnt.set(k, (cnt.get(k) || 0) + 1);
    }
    return monthsBetween(rFrom, rTo).map((k) => ({ key: k, count: cnt.get(k) || 0 }));
  }, [students, mode, rFrom, rTo]);

  // Table rows (one month or the whole range)
  const tableData = useMemo(
    () => (selectedMonth ? students.filter((s) => monthOf(s) === selectedMonth) : students),
    [students, selectedMonth],
  );

  const stats = useMemo(() => {
    const g = (s: any) => String(s.gender || "").toLowerCase();
    return {
      total: students.length,
      boys: students.filter((s) => g(s).startsWith("m")).length,
      girls: students.filter((s) => g(s).startsWith("f")).length,
    };
  }, [students]);

  const rangeLabel =
    mode === "last30"
      ? "Latest 30 admissions"
      : rFrom
        ? `${formatDate(rFrom, "short")} – ${formatDate(rTo, "short")}`
        : "Select dates";

  // Export header: school + filter
  const exportHeader: ExportHeader = {
    school: {
      name: schoolInfo?.name,
      address: schoolInfo?.address,
      logo: schoolInfo?.logo,
    },
    info: [
      { label: "Admissions", value: selectedMonth ? ymLabel(selectedMonth) : rangeLabel },
      { label: "Status", value: includeInactive ? "Active + Inactive" : "Active" },
      { label: "Total", value: tableData.length },
    ],
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
  } = useStudentModal(students, setStudents, effectiveSchoolId);
    // Keeps the columns the same on every render (the table is not re-drawn on each click)
  const openProfileRef = useRef(openStudentProfile);
  useEffect(() => {
    openProfileRef.current = openStudentProfile;
  }, [openStudentProfile]);

  const handleOpenStudentFromParent = (studentData: any) => {
    openStudentProfile(studentData);
  };

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

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });

  const [deleteDetails, setDeleteDetails] = useState("");
  const [checkingDelete, setCheckingDelete] = useState(false);

  // Trash icon → first ask the API: can this student be deleted, and what goes with it?
  const askDelete = async (student: any) => {
    if (checkingDelete || !effectiveSchoolId) return;
    setCheckingDelete(true);
    try {
      const res = await fetch(`/api/students`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student._id, schoolId: effectiveSchoolId, preview: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // e.g. "This student has fee payments ... Mark the student as Inactive instead."
        notify.error(data?.message || "This student cannot be deleted");
        return;
      }
      const parts = (data?.willDelete || []).map((w: any) => `${w.count} ${w.label}`);
      setDeleteDetails(parts.length ? `This will also delete: ${parts.join(", ")}.` : "");
      setDeleteDialog({ open: true, id: student._id });
    } catch {
      notify.error("Something went wrong");
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id || !effectiveSchoolId) return;
    try {
      const res = await fetch(`/api/students`, {
        method: "DELETE",
        body: JSON.stringify({
          id: deleteDialog.id,
          schoolId: effectiveSchoolId,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        notify.success("Student deleted successfully");
        fetchData();
      } else {
        notify.error(data?.message || "Failed to delete student");
      }
    } catch (error) {
      notify.error("Something went wrong during deletion");
    } finally {
      setDeleteDialog({ open: false, id: null });
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
                src={thumb(displayImg)}
                alt={name}
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
              className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight"
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
              <span className="text-slate-700 dark:text-slate-300 text-[12px]">{className}</span>

              <span className="mx-0.5 text-slate-700 dark:text-slate-300">-</span>

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
          <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
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
            <span className="text-slate-700 dark:text-slate-300 font-medium">
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
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
              }`}
            >
              {status}
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
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
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
    enableDensityToggle: false, // Density toggle disable
    enableColumnActions: false, // 3 dots menu disable
    enableKeyboardShortcuts: false,
    initialState: {
      density: "compact",
      pagination: { pageSize: 25, pageIndex: 0 },
      columnVisibility: {
        "parentId.address": false,
        inactiveReason: false,
        dateOfBirth: true,
        bFormNumber: false,
        gender: false,
        previousSchool: false,
        age: false,
        tenure: false,
      },
    },
    // Actions column only when the user can edit or delete students
    enableRowActions: canEditStudent || canDeleteStudent,
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
            className="h-8 w-8 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setSelectedStudent(row.original);
              setIsModalOpen(true);
            }}
          >
            <Pencil className="w-4 h-4 text-sky-500" />
          </Button>
        )}

        {canDeleteStudent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => askDelete(row.original)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>
    ),
    // Export buttons (only with "Add Student (Students) → Export / Print") + selected month tag
    renderTopToolbarCustomActions: ({ table }) => (
      <div className="flex flex-wrap items-center gap-2">
        <ExportButtons
          table={table}
          module="students"
          title="Students Report"
          header={exportHeader}
        />
        {selectedMonth && (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 h-7 text-xs font-semibold text-sky-700 cursor-pointer hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
            title="Show all months"
          >
            {ymLabel(selectedMonth)} · {tableData.length}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
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
        buttonLabel={canCreateStudent ? "Add Student" : undefined}
        onButtonClick={
          canCreateStudent
            ? () => {
                setSelectedStudent(null);
                setIsModalOpen(true);
              }
            : undefined
        }
      />

      {/* ── Admissions card: total + filters + month cards ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: total + date range */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Admissions</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {fetchLoading && !students.length ? "–" : stats.total}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{rangeLabel}</span>
            </div>
            <p className="mt-0.5 flex items-center gap-3 text-xs font-medium">
              <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                <User className="h-3.5 w-3.5" /> {stats.boys} Boys
              </span>
              <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400">
                <UserRound className="h-3.5 w-3.5" /> {stats.girls} Girls
              </span>
            </p>
          </div>

          {/* Right: presets + custom dates + inactive switch */}
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              {MODES.map((m) => {
                const on = mode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={`inline-flex items-center gap-1 px-3 h-8 text-xs font-semibold border-r last:border-r-0 border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${
                                            on
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {m.key === "custom" && <CalendarDays className="h-3.5 w-3.5" />}
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {mode === "custom" && (
                <DateRangePicker
                  from={customFrom}
                  to={customTo}
                  onChange={(f, t) => {
                    setCustomFrom(f);
                    setCustomTo(t);
                  }}
                />
              )}

              {/* Include inactive switch */}
              <button
                type="button"
                role="switch"
                aria-checked={includeInactive}
                onClick={() => setIncludeInactive((v) => !v)}
                className="inline-flex items-center gap-2 px-1 h-8 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <span
                  className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
                    includeInactive ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                      includeInactive ? "left-3.5" : "left-0.5"
                    }`}
                  />
                </span>
                Include Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Month cards (click = only that month) — hidden for "Last 30" */}
        {mode !== "last30" && (
          <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            {monthCards.map((m) => {
              const on = selectedMonth === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={!m.count}
                  title={`${ymLabel(m.key)}: ${m.count} admission(s)`}
                  onClick={() => setSelectedMonth(on ? null : m.key)}
                  className={`flex flex-col items-center gap-1.5 ${m.count ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`rounded-lg border px-2 py-1 text-sm transition-colors ${
                      on ? CARD_ON : m.count ? CARD : CARD_EMPTY
                    }`}
                  >
                    {ymCard(m.key)}
                  </span>
                  {m.count > 0 && <span className={COUNT_BADGE}>{m.count}</span>}
                </button>
              );
            })}


            {mode === "custom" && !rFrom && (
              <span className="py-2 text-xs text-slate-400 dark:text-slate-500">Select From and To dates.</span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <MaterialReactTable table={table} />
      </div>
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
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
        onStudentClick={handleOpenStudentFromParent}
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
              setViewingParent({ ...viewingParent, ...data }); // profile auto-update
              await fetchData();
              setIsParentFormOpen(false);
            } else {
              const err = await res.json().catch(() => null);
              notify.error(err?.message || "Failed to update parent details");
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
        details={deleteDetails}
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
                className="relative z-10 bg-white dark:bg-slate-900 p-1.5 rounded-md shadow-2xl border border-white/20 animate-in zoom-in duration-300 w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={thumb(displayImg, 600)}
                    className="w-full h-72 object-cover rounded-md shadow-inner border border-slate-100 dark:border-slate-800"
                    alt="Preview"
                  />
                  <button
                    onClick={() => setOpenPhotoId(null)}
                    className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 shadow-xl rounded-full p-1.5 text-slate-300 hover:text-red-500 transition-all border border-slate-100 hover:rotate-90 cursor-pointer"
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


// Guard: page opens only with "Add Student (Students) → View"
export default function Page() {
  return (
    <PageGuard module="students">
      <StudentsPage />
    </PageGuard>
  );
}