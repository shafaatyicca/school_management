"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Plus, Building2, Users, MousePointerClick } from "lucide-react";
import { notify } from "@/lib/notify";
import SchoolFormModal from "@/components/superadmin/SchoolModal";
import { UserModal } from "@/components/superadmin/UserModal";
import SchoolDetailPanel from "@/components/superadmin/SchoolDetailPanel";
import { expiryInfo, isExpiring, TONE_TEXT } from "@/components/superadmin/schoolUtils";

type Filter = "all" | "active" | "expiring" | "inactive";

const EMPTY_USER = {
  name: "",
  email: "",
  password: "",
  phone: "",
  image: "",
  role: "school_admin",
  securityQuestion: { question: "", answer: "" },
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null); // nothing selected on visit
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userForm, setUserForm] = useState(EMPTY_USER);

  const fetchInitialData = async () => {
    try {
      const [schoolsRes, plansRes] = await Promise.all([
        fetch("/api/superadmin/schools"),
        fetch("/api/superadmin/plans"),
      ]);
      const schoolsData = await schoolsRes.json();
      const plansData = await plansRes.json();
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch {
      setSchools([]);
      notify.error("Error!", "Failed to load data");
    }
  };

  const fetchUsers = async (schoolId: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/superadmin/users?schoolId=${schoolId}`);
      const data = await res.json().catch(() => null);
      setSchoolUsers(Array.isArray(data) ? data : []);
    } catch {
      setSchoolUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchInitialData();
      setLoading(false);
    })();
  }, []);

  // Selected school was deleted → close the panel
  useEffect(() => {
    if (selectedId && !schools.some((s) => s._id === selectedId)) setSelectedId(null);
  }, [schools]);

  // Users of the selected school
  useEffect(() => {
    if (selectedId) fetchUsers(selectedId);
    else setSchoolUsers([]);
  }, [selectedId]);

  // From the dashboard: ?edit=<id> (Renew → Edit school) or ?add=1 (Add school)
  const [urlHandled, setUrlHandled] = useState(false);
  useEffect(() => {
    if (loading || urlHandled) return;
    setUrlHandled(true);
    const p = new URLSearchParams(window.location.search);
    const editParam = p.get("edit");
    if (editParam && schools.some((s) => s._id === editParam)) {
      setSelectedId(editParam);
      setEditId(editParam);
      setIsSchoolModalOpen(true);
    } else if (p.get("add") === "1") {
      setEditId(null);
      setIsSchoolModalOpen(true);
    }
    // Clean the URL so a refresh doesn't reopen the form
    if (editParam || p.get("add")) window.history.replaceState(null, "", window.location.pathname);
  }, [loading, schools, urlHandled]);

  const counts = useMemo(
    () => ({
      all: schools.length,
      active: schools.filter((s) => s.status === "active").length,
      expiring: schools.filter(isExpiring).length,
      inactive: schools.filter((s) => s.status !== "active").length,
    }),
    [schools],
  );

  const visibleSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schools.filter((s) => {
      if (filter === "active" && s.status !== "active") return false;
      if (filter === "inactive" && s.status === "active") return false;
      if (filter === "expiring" && !isExpiring(s)) return false;
      if (!q) return true;
      return [s.name, s.slug, s.address, s.phone].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [schools, filter, searchQuery]);

  const selectedSchool = schools.find((s) => s._id === selectedId) || null;

  const handleSchoolSubmit = async (data: any) => {
    const res = await fetch("/api/superadmin/schools", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: editId }),
    });
    if (res.ok) {
      setIsSchoolModalOpen(false);
      setEditId(null);
      fetchInitialData();
      notify.success(
        editId ? "School Updated!" : "School Added!",
        editId ? "School updated successfully" : "New school added successfully",
      );
    } else {
      notify.error("Failed!", "Could not save school");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/superadmin/users", {
      method: userEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userForm, id: userEditId, schoolId: selectedId }),
    });
    if (res.ok) {
      setIsUserModalOpen(false);
      if (selectedId) fetchUsers(selectedId);
      fetchInitialData(); // user count
      notify.success(
        userEditId ? "User Updated!" : "User Added!",
        userEditId ? "User updated successfully" : "New user added successfully",
      );
    } else {
      const err = await res.json().catch(() => null);
      notify.error("Failed!", err?.error || "Could not save user");
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (res.ok) {
        if (selectedId) fetchUsers(selectedId);
        fetchInitialData();
        notify.success("Deleted!", "User has been removed successfully");
      } else {
        notify.error("Failed!", "Could not delete user");
      }
    } catch {
      notify.error("Error!", "Something went wrong");
    }
  };

  // Open the school's own dashboard (subdomain)
  const switchToSchool = (school: any) => {
    const slug = school.slug;
    if (!slug) {
      notify.error("Failed!", "This school has no slug");
      return;
    }
    const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "lvh.me:3000";
    const isLocal =
      window.location.hostname.includes("lvh.me") || window.location.hostname.includes("localhost");
    const protocol = isLocal ? "http" : "https";
    window.location.href = `${protocol}://${slug}.${mainDomain}`;
  };

  const FILTERS: { key: Filter; label: string; on: string }[] = [
    { key: "all", label: "All", on: "bg-slate-900 text-white border-slate-900" },
    { key: "active", label: "Active", on: "bg-emerald-600 text-white border-emerald-600" },
    { key: "expiring", label: "Expiring", on: "bg-amber-500 text-white border-amber-500" },
    { key: "inactive", label: "Inactive", on: "bg-rose-600 text-white border-rose-600" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Filters | Search (center) | Add School */}
      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-2 shrink-0 w-full lg:w-auto">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 h-9 text-xs font-semibold transition-colors cursor-pointer ${
                  on ? f.on : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : "bg-slate-100"}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 w-full lg:max-w-md lg:mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            placeholder="Search name, slug, address..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-md text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setEditId(null);
            setIsSchoolModalOpen(true);
          }}
          className="w-full lg:w-auto shrink-0 bg-slate-900 text-white px-4 py-2 rounded-md flex items-center justify-center gap-1 text-sm hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <Plus size={18} /> Add School
        </button>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
        {/* Left: school list */}
        <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Schools ({visibleSchools.length})
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-3/4 rounded bg-slate-100" />
                    <div className="h-2 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : visibleSchools.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No schools found.</p>
            ) : (
              visibleSchools.map((s) => {
                const on = s._id === selectedId;
                const exp = expiryInfo(s.expiryDate);
                return (
                  <button
                    key={s._id}
                    onClick={() => setSelectedId(s._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      on ? "bg-indigo-50 border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-0.5 overflow-hidden">
                        {s.logo ? (
                          <img src={s.logo} className="max-w-full max-h-full object-contain" alt="" />
                        ) : (
                          <Building2 className="text-slate-300" size={16} />
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          s.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold uppercase truncate ${on ? "text-indigo-700" : "text-slate-700"}`}>
                        {s.name}
                      </p>
                      <p className={`text-[11px] truncate ${s.status === "active" ? TONE_TEXT[exp.tone] : "text-rose-600"}`}>
                        {s.status === "active" ? exp.label : `Inactive · ${exp.label}`}
                      </p>
                    </div>
                    <span
                      title={`${s.userCount ?? 0} user(s)`}
                      className="inline-flex items-center gap-1 shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600"
                    >
                      <Users size={11} /> {s.userCount ?? 0}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: details (only after a school is clicked) */}
        {selectedSchool ? (
          <SchoolDetailPanel
            school={selectedSchool}
            users={schoolUsers}
            usersLoading={usersLoading}
            onEdit={(s: any) => {
              setEditId(s._id);
              setIsSchoolModalOpen(true);
            }}
            onSwitch={switchToSchool}
            onRefresh={fetchInitialData}
            onAddUser={() => {
              setUserEditId(null);
              setUserForm(EMPTY_USER);
              setIsUserModalOpen(true);
            }}
            onEditUser={(u: any) => {
              setUserEditId(u._id);
              setUserForm({
                name: u.name,
                email: u.email,
                password: "",
                phone: u.phone || "",
                image: u.image || "",
                role: u.role || "school_admin",
                securityQuestion: u.securityQuestion || { question: "", answer: "" },
              });
              setIsUserModalOpen(true);
            }}
            onDeleteUser={handleDeleteAdmin}
          />
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-200 bg-white text-sm text-slate-400">
            {loading ? (
              <>
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                Loading schools…
              </>
            ) : schools.length ? (
              <>
                <MousePointerClick size={28} className="text-indigo-300" />
                Select a school to see its details
              </>
            ) : (
              <>
                <Building2 size={28} />
                No schools yet. Add your first school.
              </>
            )}
          </div>
        )}
      </div>

      <SchoolFormModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        onSubmit={handleSchoolSubmit}
        school={editId ? schools.find((s: any) => s._id === editId) : null}
        plans={plans}
      />
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        formData={userForm}
        setFormData={setUserForm}
        onSubmit={handleUserSubmit}
        isEditing={!!userEditId}
        schoolId={selectedId}
      />
    </div>
  );
}