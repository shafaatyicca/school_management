"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Plus } from "lucide-react";
import { notify } from "@/lib/notify";
import { AdminList } from "@/components/superadmin/UserList";
import SchoolFormModal from "@/components/superadmin/SchoolModal";
import { UserModal } from "@/components/superadmin/UserModal";
import SchoolCard from "@/components/superadmin/SchoolCard";

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
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
    phone: "",
    image: "",
    role: "school_admin",
    securityQuestion: { question: "", answer: "" },
  });

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/schools");
      const data = await res.json();
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      setSchools([]);
      notify.error("Error!", "Failed to load schools");
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
    const res = await fetch("/api/superadmin/schools", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: editId }),
    });
    if (res.ok) {
      setIsSchoolModalOpen(false);
      setEditId(null);
      fetchSchools();
      notify.success(
        editId ? "School Updated!" : "School Added!",
        editId
          ? "School updated successfully"
          : "New school added successfully",
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
      body: JSON.stringify({
        ...userForm,
        id: userEditId,
        schoolId: expandedSchool,
      }),
    });
    if (res.ok) {
      setIsUserModalOpen(false);
      if (expandedSchool) fetchUsers(expandedSchool);
      notify.success(
        userEditId ? "User Updated!" : "User Added!",
        userEditId
          ? "User updated successfully"
          : "New user added successfully",
      );
    } else {
      notify.error("Failed!", "Could not save user");
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
        if (expandedSchool) fetchUsers(expandedSchool);
        notify.success("Deleted!", "User has been removed successfully");
      } else {
        notify.error("Failed!", "Could not delete user");
      }
    } catch (err) {
      notify.error("Error!", "Something went wrong");
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
                onSwitch={(school: any) => {
                  console.log("School Data:", school);
                  const slug = school.slug;
                  if (!slug) {
                    alert("Slug missing");
                    return;
                  }

                  window.location.href = `http://${slug}.lvh.me:3000`;
                }}
              />
              {expandedSchool === school._id && (
                <div className="mt-2 ml-4 animate-in slide-in-from-top-2 duration-200">
                  <AdminList
                    users={schoolUsers}
                    onAddAdmin={() => {
                      setUserEditId(null);
                      setUserForm({
                        name: "",
                        email: "",
                        password: "",
                        phone: "",
                        image: "",
                        role: "school_admin",
                        securityQuestion: { question: "", answer: "" },
                      });
                      setIsUserModalOpen(true);
                    }}
                    onEditAdmin={(u: any) => {
                      setUserEditId(u._id);
                      setUserForm({
                        name: u.name,
                        email: u.email,
                        password: "",
                        phone: u.phone || "",
                        image: u.image || "",
                        role: u.role || "school_admin",
                        securityQuestion: u.securityQuestion || {
                          question: "",
                          answer: "",
                        },
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
        schoolId={expandedSchool}
      />
    </div>
  );
}
