"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog } from "@mui/material";
import {
  Search,
  Loader2,
  CornerDownLeft,
  UserRound,
  Briefcase,
  ReceiptText,
  BookUser,
  User,
} from "lucide-react";
import StudentProfileModal from "@/components/StudentProfileModal";
import ParentProfileModal from "@/components/ParentProfileModal";
import EmployeeProfileModal from "@/components/EmployeeProfileModal";
import { getSearchPages, type SearchPage } from "@/components/menuConfig";
import { usePermissions } from "@/components/PermissionsProvider";
import { showAccessDenied } from "@/lib/accessDenied";
import { printBioData } from "@/lib/printFeeVoucher";
import { DEFAULT_UNDERTAKING } from "@/lib/voucherDates";
import { notify } from "@/lib/notify";
import { getSubdomain } from "@/lib/host";

type Results = { students: any[]; parents: any[]; employees: any[] };
const EMPTY: Results = { students: [], parents: [], employees: [] };
const LEDGER = "/student-fee-ledger";

type Item =
  | { kind: "page"; key: string; data: SearchPage }
  | { kind: "student"; key: string; data: any }
  | { kind: "parent"; key: string; data: any }
  | { kind: "employee"; key: string; data: any };

export default function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const isAdmin = isSuperAdmin || session?.user?.role === "school_admin";

  // ── Permissions (same ticks as User Access)
  const { can } = usePermissions();
  const canStudentProfile = can("students", "view") || can("studentInfo", "view");
  const canLedger = can("fees", "view");
  const canBioData = can("bioData", "export");
  const canStudents = canStudentProfile || canLedger || canBioData;
  const canParents = can("parents", "view");
  const canEmployees = can("employees", "view");
  const canSearchPeople = canStudents || canParents || canEmployees;

  const [schoolId, setSchoolId] = useState<string | null>(session?.user?.schoolId || null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Profile popups (open on any page)
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [viewParent, setViewParent] = useState<any>(null);
  const [viewEmployee, setViewEmployee] = useState<any>(null);

  // School + settings for Bio Data print (loaded once)
  const [printCtx, setPrintCtx] = useState<any>(null);

  // ── School id (super admin → from subdomain)
  useEffect(() => {
    if (session?.user?.schoolId) {
      setSchoolId(session.user.schoolId);
      return;
    }
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((d) => d?._id && setSchoolId(d._id))
        .catch(() => {});
    }
  }, [isSuperAdmin, session?.user?.schoolId]);

  // ── Ctrl + K / Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  // ── Reset when closed
  useEffect(() => {
    if (!open) {
      setQ("");
      setResults(EMPTY);
      setActive(0);
    }
  }, [open]);

  // ── Put the cursor in the search box as soon as the popup opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // ── Load print context once (background) — only if Bio Data print is allowed
  useEffect(() => {
    if (!open || !schoolId || printCtx || !canBioData) return;
    Promise.all([
      fetch(`/api/superadmin/schools?id=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/settings?schoolId=${schoolId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sch, set]) =>
        setPrintCtx({
          school: { name: sch?.name, address: sch?.address, logo: sch?.logo, phone: sch?.phone },
          undertaking: set?.admission?.undertaking || DEFAULT_UNDERTAKING,
          style: set?.admission?.formStyle === "style2" ? "style2" : "style1",
        }),
      )
      .catch(() => {});
  }, [open, schoolId, printCtx, canBioData]);

  // ── People search (300ms after typing stops)
  useEffect(() => {
    const term = q.trim();
    if (!schoolId || term.length < 2 || !canSearchPeople) {
      setResults(EMPTY);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/global-search?q=${encodeURIComponent(term)}&schoolId=${schoolId}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => setResults(d?.students ? d : EMPTY))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, schoolId, canSearchPeople]);

  // Only the groups this user is allowed to see
  const visible: Results = useMemo(
    () => ({
      students: canStudents ? results.students : [],
      parents: canParents ? results.parents : [],
      employees: canEmployees ? results.employees : [],
    }),
    [results, canStudents, canParents, canEmployees],
  );

  // ── Pages (instant, local) — only pages with "View"
  const pages = useMemo(() => {
    const all = getSearchPages(isSuperAdmin, isAdmin, can);
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return all
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.group.toLowerCase().includes(term) ||
          p.keywords.some((k) => k.includes(term)),
      )
      .slice(0, 6);
  }, [q, isSuperAdmin, isAdmin, can]);

  // Flat list for keyboard navigation
  const items: Item[] = useMemo(
    () => [
      ...pages.map((p) => ({ kind: "page" as const, key: `p-${p.href}`, data: p })),
      ...visible.students.map((s) => ({ kind: "student" as const, key: `s-${s._id}`, data: s })),
      ...visible.parents.map((p) => ({ kind: "parent" as const, key: `pa-${p._id}`, data: p })),
      ...visible.employees.map((e) => ({ kind: "employee" as const, key: `e-${e._id}`, data: e })),
    ],
    [pages, visible],
  );

  useEffect(() => setActive(0), [items.length]);

  // ── Actions
  const fetchFullStudent = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/students?ids=${id}&schoolId=${schoolId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(data?.message || "Could not load student");
        return null;
      }
      return Array.isArray(data) ? data[0] : null;
    },
    [schoolId],
  );

  const openStudentProfile = async (id: string) => {
    if (!canStudentProfile) return;
    onOpenChange(false);
    try {
      const s = await fetchFullStudent(id);
      if (s) setViewStudent(s);
    } catch {
      notify.error("Could not load student");
    }
  };

  const openLedger = (id: string) => {
    if (!canLedger) return;
    onOpenChange(false);
    const url = `${LEDGER}?student=${id}`;
    if (pathname === LEDGER) {
      // Already on the ledger → load the student without navigating
      window.dispatchEvent(new CustomEvent("ledger:open-student", { detail: id }));
      router.replace(url);
    } else {
      router.push(url);
    }
  };

  const printBio = async (id: string) => {
    if (!canBioData) return;
    if (!printCtx) {
      notify.error("Loading school details — please try again in a moment");
      return;
    }
    try {
      const s = await fetchFullStudent(id);
      if (s) printBioData([s], printCtx);
    } catch {
      notify.error("Could not load student");
    }
  };

  // Student row click / Enter → first allowed action
  const openStudent = (id: string) => {
    if (canStudentProfile) openStudentProfile(id);
    else if (canLedger) openLedger(id);
    else if (canBioData) printBio(id);
  };

  const runDefault = (item: Item) => {
    if (item.kind === "page") {
      onOpenChange(false);
      router.push(item.data.href);
    } else if (item.kind === "student") {
      openStudent(item.data._id);
    } else if (item.kind === "parent") {
      onOpenChange(false);
      setViewParent(item.data);
    } else {
      onOpenChange(false);
      setViewEmployee(item.data);
    }
  };

  // Edit from the profile popups → only with the "Edit" tick
  const goEdit = (
    module: "students" | "parents" | "employees",
    href: string,
    label: string,
    close: () => void,
  ) => {
    if (!can(module, "edit")) {
      showAccessDenied(`You don't have permission to edit ${label}.`);
      return;
    }
    close();
    router.push(href);
  };

  // ── Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runDefault(items[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // ── UI helpers
  const Section = ({ title }: { title: string }) => (
    <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
  );

  const rowClass = (idx: number) =>
    `group flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
      idx === active ? "bg-sky-500/10" : "hover:bg-muted"
    }`;

  const ActionBtn = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 h-6 text-[10px] font-semibold text-foreground hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer"
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );

  const avatar = (src: string, fallback: string) => (
    <img
      src={src || fallback}
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-cover border border-border"
      onError={(e) => ((e.currentTarget as HTMLImageElement).src = fallback)}
    />
  );

  let idx = -1;
  const term = q.trim();

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        fullWidth
        maxWidth="sm"
        disableRestoreFocus
        TransitionProps={{ onEntered: () => inputRef.current?.focus() }}
        sx={{
          "& .MuiDialog-container": { alignItems: "flex-start" },
          "& .MuiPaper-root": {
            mt: "10vh",
            borderRadius: "14px",
            backgroundColor: "var(--card)",
            backgroundImage: "none",
            border: "1px solid var(--border)",
          },
        }}
        BackdropProps={{ sx: { backgroundColor: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)" } }}
      >
        {/* Input */}
        <div className="flex items-center gap-2 border-b border-border px-4 h-14">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type anything you're looking for…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto pb-2">
          {!term && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Start typing to search pages, students, parents and employees
            </p>
          )}
          {pages.length > 0 && <Section title={term ? "Pages" : "Quick Links"} />}
          {pages.map((p) => {
            idx++;
            const i = idx;
            const Icon = p.icon;
            return (
              <div
                key={p.href}
                data-idx={i}
                className={rowClass(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => runDefault({ kind: "page", key: p.href, data: p })}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{p.name}</p>
                  {p.group && <p className="text-[10px] text-muted-foreground">{p.group}</p>}
                </div>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            );
          })}

          {visible.students.length > 0 && <Section title="Students" />}
          {visible.students.map((s) => {
            idx++;
            const i = idx;
            return (
              <div
                key={s._id}
                data-idx={i}
                className={rowClass(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => openStudent(s._id)}
              >
                {avatar(
                  s.image,
                  s.gender === "Female" ? "/studentfemale-avatar.jpg" : "/studentmale-avatar.jpg",
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {s.fullName}
                    {s.status === "inactive" && (
                      <span className="ml-1.5 rounded bg-rose-500 px-1 text-[9px] font-bold text-white">
                        INACTIVE
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    GR {s.grNumber} · {s.className}
                    {s.section ? ` (${s.section})` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canStudentProfile && (
                    <ActionBtn icon={User} label="Profile" onClick={() => openStudentProfile(s._id)} />
                  )}
                  {canLedger && (
                    <ActionBtn icon={ReceiptText} label="Fee Ledger" onClick={() => openLedger(s._id)} />
                  )}
                  {canBioData && (
                    <ActionBtn icon={BookUser} label="Bio Data" onClick={() => printBio(s._id)} />
                  )}
                </div>
              </div>
            );
          })}

          {visible.parents.length > 0 && <Section title="Parents" />}
          {visible.parents.map((p) => {
            idx++;
            const i = idx;
            return (
              <div
                key={p._id}
                data-idx={i}
                className={rowClass(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => runDefault({ kind: "parent", key: p._id, data: p })}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{p.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    P-ID {p.p_id} · {p.phone || "---"} · {p.cnic || "---"}
                  </p>
                </div>
              </div>
            );
          })}

          {visible.employees.length > 0 && <Section title="Employees" />}
          {visible.employees.map((e) => {
            idx++;
            const i = idx;
            return (
              <div
                key={e._id}
                data-idx={i}
                className={rowClass(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => runDefault({ kind: "employee", key: e._id, data: e })}
              >
                {e.image ? (
                  avatar(e.image, e.gender === "female" ? "/female-avatar.jpg" : "/male-avatar.jpg")
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-600">
                    <Briefcase className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{e.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ID {e.emp_id || "---"} · {e.designation || e.staffCategory || "---"} · {e.phone || "---"}
                  </p>
                </div>
              </div>
            );
          })}

          {term.length >= 2 && !loading && items.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nothing found for “{term}”
            </p>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ move</span>
          <span>Enter open</span>
          <span className="ml-auto">Ctrl + K</span>
        </div>
      </Dialog>

      {/* ── Profile popups (any page) ── */}
      <StudentProfileModal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        student={viewStudent}
        onEdit={() => goEdit("students", "/students", "students", () => setViewStudent(null))}
      />
      <ParentProfileModal
        isOpen={!!viewParent}
        onClose={() => setViewParent(null)}
        parent={viewParent}
        schoolId={schoolId}
        onStudentClick={(s: any) => {
          setViewParent(null);
          if (canStudentProfile) setViewStudent(s);
        }}
        onEdit={() => goEdit("parents", "/parents", "parents", () => setViewParent(null))}
      />
      <EmployeeProfileModal
        isOpen={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        staff={viewEmployee}
        onEdit={() => goEdit("employees", "/employees", "employees", () => setViewEmployee(null))}
      />
    </>
  );
}