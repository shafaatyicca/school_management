"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Settings2,
  LogOut,
  Loader2,
  Search,
  LayoutDashboard,
  Building2,
  CreditCard,
  FileText,
  Menu,
  X,
  Trash2,
} from "lucide-react";
import GlobalStats from "@/components/superadmin/GlobalStats";

// Components
import { SchoolCard } from "@/components/superadmin/SchoolCard";
import { SchoolModal } from "@/components/superadmin/SchoolModal";
import { AdminList } from "@/components/superadmin/AdminList";
import { UserModal } from "@/components/superadmin/UserModal";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Sidebar & Tab States
  const [activeTab, setActiveTab] = useState("institutions");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- AAPKA PURANA LOGIC (SAME AS BEFORE) ---
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEditId, setUserEditId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    phone: "",
    logo: "",
    status: "active",
  });

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

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const body: any = { ...schoolForm };
    if (editId) body.id = editId;

    const res = await fetch("/api/superadmin/schools", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setIsSchoolModalOpen(false);
      setEditId(null);
      fetchSchools();
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...userForm,
      id: userEditId,
      schoolId: expandedSchool,
      role: "school_admin",
    };
    const res = await fetch("/api/superadmin/users", {
      method: userEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setIsUserModalOpen(false);
      if (expandedSchool) fetchUsers(expandedSchool);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (confirm("Are you sure?")) {
      const res = await fetch(`/api/superadmin/users?id=${userId}`, {
        method: "DELETE",
      });
      if (res.ok && expandedSchool) fetchUsers(expandedSchool);
    }
  };

  const handleSchoolDelete = async (id: string) => {
    const res = await fetch(`/api/superadmin/schools?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchSchools();
  };

  if (status === "loading" || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium italic">
          Initializing Professional Dashboard...
        </p>
      </div>
    );
  }

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "institutions", label: "Institutions", icon: Building2 },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "invoices", label: "Invoices", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* 1. SIDEBAR */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"} bg-slate-900 transition-all duration-300 fixed h-full z-50 overflow-hidden`}
      >
        <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Settings2 size={20} />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-xl tracking-tight uppercase">
              EduControl
            </span>
          )}
        </div>

        <nav className="mt-6 px-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                activeTab === item.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && (
                <span className="font-bold text-sm">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 w-full px-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && (
              <span className="font-bold text-sm">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main
        className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}
      >
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
              {activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-900 uppercase leading-none">
                {session?.user?.name}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Super Admin
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-indigo-600 font-black text-sm">
                {session?.user?.name?.[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === "institutions" && (
            <div className="space-y-6">
              <GlobalStats refreshTrigger={schools} />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    placeholder="Search institutions by name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
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
                      status: "active",
                    });
                    setIsSchoolModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  <Plus size={18} /> Add New School
                </button>
              </div>

              <div className="space-y-4">
                {schools
                  .filter((s: any) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((school: any) => (
                    <div
                      key={school._id}
                      className="animate-in fade-in slide-in-from-bottom-2"
                    >
                      <SchoolCard
                        school={school}
                        isExpanded={expandedSchool === school._id}
                        onStatusChange={fetchSchools}
                        onEdit={(s: any) => {
                          setEditId(s._id);
                          setSchoolForm({
                            name: s.name || "",
                            address: s.address || "",
                            phone: s.phone || "",
                            logo: s.logo || "",
                            status:
                              s.status ||
                              (s.isActive === false ? "inactive" : "active"),
                          });
                          setIsSchoolModalOpen(true);
                        }}
                        onDelete={handleSchoolDelete}
                        onSwitch={(id: string) => router.push(`/${id}`)}
                        onExpand={(id: string) => {
                          setExpandedSchool(expandedSchool === id ? null : id);
                          if (expandedSchool !== id) fetchUsers(id);
                        }}
                      />
                      {expandedSchool === school._id && (
                        <div className="mt-2 ml-4">
                          <AdminList
                            users={schoolUsers}
                            onAddAdmin={() => {
                              setUserEditId(null);
                              setUserForm({
                                name: "",
                                email: "",
                                password: "",
                              });
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
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
              <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 mb-4">
                <LayoutDashboard size={40} />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs text-center">
                Analytics Dashboard <br />{" "}
                <span className="text-slate-400 font-medium lowercase">
                  Coming in Step 4
                </span>
              </p>
            </div>
          )}

          {/* Placeholders for Subscriptions and Invoices */}
          {/* SUBSCRIPTIONS TAB */}
          {activeTab === "subscriptions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    Subscription Plans
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    Manage your SaaS pricing tiers and features
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Yahan hum plan create karne ka modal open karenge
                    alert(
                      "Plan Modal logic hum aglay step mein API ke sath add karenge!",
                    );
                  }}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus size={18} /> Create New Plan
                </button>
              </div>

              {/* Plans Display Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sample Plan Card (Silver) */}
                <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group hover:border-indigo-500 transition-all">
                  <div className="absolute top-0 right-0 bg-slate-100 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Basic
                  </div>
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-slate-800 uppercase">
                      Silver Plan
                    </h3>
                    <p className="text-slate-400 text-xs font-bold">
                      Best for small schools
                    </p>
                  </div>
                  <div className="mb-8">
                    <span className="text-4xl font-black text-slate-900">
                      $49
                    </span>
                    <span className="text-slate-400 font-bold">/month</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Up to 200 Students",
                      "Basic Analytics",
                      "Email Support",
                    ].map((feat, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-sm font-bold text-slate-600"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-xs hover:bg-slate-200 transition-all">
                      Edit Plan
                    </button>
                    <button className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Placeholder for more plans */}
                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <CreditCard size={24} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No more plans found
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS (UNCHANGED) */}
      <SchoolModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        formData={schoolForm}
        setFormData={setSchoolForm}
        onSubmit={handleSchoolSubmit}
        isEditing={!!editId}
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
