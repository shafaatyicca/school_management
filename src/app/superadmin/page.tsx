"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, LogOut, Loader2, Search } from "lucide-react";

// Components
import { SchoolCard } from "@/components/superadmin/SchoolCard";
import { SchoolModal } from "@/components/superadmin/SchoolModal";
import { AdminList } from "@/components/superadmin/AdminList";
import { UserModal } from "@/components/superadmin/UserModal"; // <-- Naya component jo hum ne banaya

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Schools States
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

  // Admins States
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // School Modal States
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    phone: "",
    logo: "",
    isActive: true,
  });

  // --- API CALLS ---
  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/superadmin/schools");
      const data = await res.json();
      setSchools(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (schoolId: string) => {
    const res = await fetch(`/api/superadmin/users?schoolId=${schoolId}`);
    const data = await res.json();
    setSchoolUsers(data);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // --- SCHOOL ACTIONS ---
  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const body = editId ? { id: editId, ...schoolForm } : schoolForm;

    const res = await fetch("/api/superadmin/schools", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setIsSchoolModalOpen(false);
      setEditId(null);
      setSchoolForm({
        name: "",
        address: "",
        phone: "",
        logo: "",
        isActive: true,
      });
      fetchSchools();
    }
  };

  // --- ADMIN (USER) ACTIONS ---
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = userEditId ? "PUT" : "POST";

    // Payload mein schoolId aur role lazmi bhejien
    const payload = {
      ...userForm,
      id: userEditId,
      schoolId: expandedSchool,
      role: "school_admin",
    };

    const res = await fetch("/api/superadmin/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsUserModalOpen(false);
      setUserForm({ name: "", email: "", password: "" });
      if (expandedSchool) fetchUsers(expandedSchool);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (confirm("Are you sure you want to delete this admin?")) {
      const res = await fetch(`/api/superadmin/users?id=${userId}`, {
        method: "DELETE",
      });
      if (res.ok && expandedSchool) fetchUsers(expandedSchool);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading System...</p>
      </div>
    );
  }

  const handleSchoolDelete = async (id: string) => {
    const res = await fetch(`/api/superadmin/schools?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchSchools(); // List refresh karein
    }
  };
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* NAVBAR */}
      <nav className="bg-white border-b sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Settings2 size={20} />
            </div>
            <h1 className="font-black text-xl tracking-tight">EduControl</h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-500 hover:text-red-600 font-bold text-sm flex items-center gap-2"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800">Institutions</h2>
            <p className="text-slate-400 text-sm">
              Manage school network and admins.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                placeholder="Search schools..."
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 w-full text-sm"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setEditId(null);
                setSchoolForm({
                  name: "",
                  address: "",
                  phone: "",
                  logo: "",
                  isActive: true,
                });
                setIsSchoolModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 md:px-6 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <Plus size={20} />{" "}
              <span className="hidden md:inline">Add School</span>
            </button>
          </div>
        </div>

        {/* SCHOOL LIST */}
        <div className="space-y-4">
          {schools
            .filter((s: any) =>
              s.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((school: any) => (
              <div key={school._id} className="space-y-2">
                <SchoolCard
                  school={school}
                  isExpanded={expandedSchool === school._id}
                  onEdit={(s: any) => {
                    setEditId(s._id);
                    setSchoolForm(s);
                    setIsSchoolModalOpen(true);
                  }}
                  onDelete={handleSchoolDelete} // <-- YE LINE ADD KAREIN
                  onSwitch={(id: string) => router.push(`/${id}`)}
                  onExpand={(id: string) => {
                    setExpandedSchool(expandedSchool === id ? null : id);
                    if (expandedSchool !== id) fetchUsers(id);
                  }}
                />

                {expandedSchool === school._id && (
                  <AdminList
                    users={schoolUsers}
                    onAddAdmin={() => {
                      setUserEditId(null);
                      setUserForm({ name: "", email: "", password: "" });
                      setIsUserModalOpen(true);
                    }}
                    onEditAdmin={(user: any) => {
                      setUserEditId(user._id);
                      setUserForm({
                        name: user.name,
                        email: user.email,
                        password: "",
                      });
                      setIsUserModalOpen(true);
                    }}
                    onDeleteAdmin={handleDeleteAdmin}
                  />
                )}
              </div>
            ))}
        </div>
      </main>

      {/* SCHOOL MODAL */}
      <SchoolModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        formData={schoolForm}
        setFormData={setSchoolForm}
        onSubmit={handleSchoolSubmit}
        isEditing={!!editId}
      />

      {/* USER MODAL (For Admins) */}
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
