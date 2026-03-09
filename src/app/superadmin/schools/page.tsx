"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Phone,
  Edit,
  ExternalLink,
  ChevronDown,
  Building2,
  Trash2,
  Search,
  Plus,
} from "lucide-react";
import Link from "next/link";

// Components
import { AdminList } from "@/components/superadmin/UserList";
import SchoolFormModal from "@/components/superadmin/SchoolModal";
import { UserModal } from "@/components/superadmin/UserModal";

// --- SchoolCard Component ---
const SchoolCard = ({
  school,
  onEdit,
  onSwitch,
  onExpand,
  onRefresh,
  isExpanded,
}: any) => {
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm("Are you sure? This will delete the school and all its data!")
    ) {
      try {
        const res = await fetch(`/api/superadmin/schools?id=${school._id}`, {
          method: "DELETE",
        });
        if (res.ok) onRefresh();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = school.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/superadmin/schools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school._id, status: newStatus }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-md border transition-all duration-300 ${
        isExpanded
          ? "border-indigo-400 ring-1 ring-indigo-50 shadow-sm"
          : "border-slate-100"
      }`}
      // --- HOVER EFFECT START ---
      style={{
        transition: "all 0.3s ease-in-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 15px 30px rgba(0,0,0,0.20)";
        e.currentTarget.style.filter = "brightness(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.filter = "brightness(1)";
      }}
      // --- HOVER EFFECT END ---
    >
      <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4 rounded-md border border-slate-600">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative cursor-pointer" onClick={handleToggleStatus}>
            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
              {school.logo ? (
                <img
                  src={school.logo}
                  className="object-cover w-full h-full"
                  alt="logo"
                />
              ) : (
                <Building2 className="text-slate-300" size={20} />
              )}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                school.status === "active" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                {school.name}
              </h3>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${school.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
              >
                {school.status}
              </span>
            </div>
            <div className="flex gap-x-3 mt-0.5 text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <MapPin size={12} /> {school.address}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Phone size={12} /> {school.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50">
          {/* VIEW INVOICES BUTTON - Fixed Layout */}
          <div className="flex flex-1 md:flex-col lg:flex-row gap-2 w-full lg:w-auto items-center">
            {/* VIEW INVOICES LINK */}
            <Link
              href={`/superadmin/schools/${school._id}`}
              className="flex-1 md:w-full lg:w-auto bg-slate-900 text-white px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-600 transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              <ExternalLink size={14} className="shrink-0" />
              <span>View Invoices</span>
            </Link>

            {/* DASHBOARD REDIRECT BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitch(school._id);
              }}
              className="flex-1 md:w-full lg:w-auto bg-slate-900 text-white px-2 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-indigo-600 transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              <ExternalLink size={14} className="shrink-0" />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(school);
              }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-[1px] h-6 bg-slate-400 mx-1" />

            {/* EXPAND BUTTON FIX */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(school._id);
              }}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                isExpanded
                  ? "bg-indigo-50 text-indigo-600 rotate-180"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Schools Page ---
export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/schools");
      const data = await res.json();
      setSchools(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    const res = await fetch("/api/superadmin/plans");
    const data = await res.json();
    if (Array.isArray(data)) setPlans(data);
  };

  const fetchUsers = async (schoolId: string) => {
    const res = await fetch(`/api/superadmin/users?schoolId=${schoolId}`);
    const data = await res.json();
    setSchoolUsers(data);
  };

  useEffect(() => {
    fetchSchools();
    fetchPlans();
  }, []);

  const handleSchoolSubmit = async (data: any) => {
    const method = editId ? "PUT" : "POST";
    const res = await fetch("/api/superadmin/schools", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: editId }),
    });
    if (res.ok) {
      setIsSchoolModalOpen(false);
      setEditId(null);
      fetchSchools();
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/superadmin/users", {
      method: userEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userForm,
        id: userEditId,
        schoolId: expandedSchool,
        role: "school_admin",
      }),
    });
    if (res.ok) {
      setIsUserModalOpen(false);
      if (expandedSchool) fetchUsers(expandedSchool);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading Schools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            placeholder="Search schools..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-md text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setIsSchoolModalOpen(true);
          }}
          className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2 rounded-md flex items-center justify-center gap-1 text-sm hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <Plus size={18} /> Add School
        </button>
      </div>

      <div className="space-y-4">
        {schools
          .filter((s: any) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((school: any) => (
            <div key={school._id}>
              <SchoolCard
                school={school}
                isExpanded={expandedSchool === school._id}
                onEdit={(s: any) => {
                  setEditId(s._id);
                  setIsSchoolModalOpen(true);
                }}
                onRefresh={fetchSchools}
                onExpand={(id: string) => {
                  const nextId = expandedSchool === id ? null : id;
                  setExpandedSchool(nextId);
                  if (nextId) fetchUsers(id);
                }}
                // ROUTING PATH FIX: taake direct root dashboard par jaye
                onSwitch={(id: string) => router.push(`/${id}`)}
              />
              {expandedSchool === school._id && (
                <div className="mt-2 ml-4 animate-in slide-in-from-top-2 duration-200">
                  <AdminList
                    users={schoolUsers}
                    onAddAdmin={() => {
                      setUserEditId(null);
                      setUserForm({ name: "", email: "", password: "" });
                      setIsUserModalOpen(true);
                    }}
                    onEditAdmin={(u: any) => {
                      setUserEditId(u._id);
                      setUserForm({
                        name: u.name,
                        email: u.email,
                        password: "",
                      });
                      setIsUserModalOpen(true);
                    }}
                    onDeleteAdmin={() => fetchUsers(expandedSchool)}
                  />
                </div>
              )}
            </div>
          ))}
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
      />
    </div>
  );
}
