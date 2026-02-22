"use client";
import { useState, useEffect, Fragment } from "react";
import {
  Trash2,
  Edit,
  Plus,
  UserPlus,
  Users,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState([]);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);

  // Modals States
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Edit logic states
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    phone: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchSchools = async () => {
    const res = await fetch("/api/superadmin/schools");
    const data = await res.json();
    setSchools(data);
  };

  const fetchUsers = async (schoolId: string) => {
    const res = await fetch(`/api/superadmin/users?schoolId=${schoolId}`);
    const data = await res.json();
    setSchoolUsers(data);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // --- SCHOOL SUBMIT (ADD & EDIT) ---
  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const body = editId ? { id: editId, ...schoolForm } : schoolForm;

    const res = await fetch("/api/superadmin/schools", {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert(editId ? "School Updated!" : "School Registered!");
      setIsSchoolModalOpen(false);
      setEditId(null);
      setSchoolForm({
        name: "",
        address: "",
        phone: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });
      fetchSchools();
    }
  };

  // --- DELETE SCHOOL ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure? This will delete the school and its admins.")) {
      await fetch(`/api/superadmin/schools?id=${id}`, { method: "DELETE" });
      fetchSchools();
    }
  };

  // --- OPEN EDIT MODAL ---
  const openEditModal = (e: React.MouseEvent, school: any) => {
    e.stopPropagation();
    setEditId(school._id);
    setSchoolForm({
      name: school.name,
      address: school.address,
      phone: school.phone,
      adminName: "",
      adminEmail: "",
      adminPassword: "", // Edit mein admin fields zaruri nahi
    });
    setIsSchoolModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // URL ko theek kiya: Ab ye Users wali API pe jayega
    const res = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userForm,
        schoolId: selectedSchoolId,
        role: "school_admin",
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Additional Admin Added!");
      setIsUserModalOpen(false);
      // Form reset
      setUserForm({ name: "", email: "", password: "" });
      // List refresh
      if (selectedSchoolId) fetchUsers(selectedSchoolId);
    } else {
      alert("Error: " + data.error);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Schools Directory</h1>
        <button
          onClick={() => {
            setEditId(null);
            setSchoolForm({
              name: "",
              address: "",
              phone: "",
              adminName: "",
              adminEmail: "",
              adminPassword: "",
            });
            setIsSchoolModalOpen(true);
          }}
          className="bg-black text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
        >
          <Plus size={18} /> Add New School
        </button>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">School Details</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {schools.map((school: any) => (
              <Fragment key={school._id}>
                <tr
                  onClick={() => {
                    expandedSchool === school._id
                      ? setExpandedSchool(null)
                      : (setExpandedSchool(school._id), fetchUsers(school._id));
                  }}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    {expandedSchool === school._id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    <span className="font-semibold text-gray-800">
                      {school.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {school.phone}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={(e) => openEditModal(e, school)}
                        className="text-blue-600 hover:scale-110 transition-transform"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, school._id)}
                        className="text-red-600 hover:scale-110 transition-transform"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedSchool === school._id && (
                  <tr className="bg-blue-50/30">
                    <td colSpan={3} className="px-12 py-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Users size={16} /> Administrators
                        </h3>
                        <button
                          onClick={() => {
                            setSelectedSchoolId(school._id);
                            setIsUserModalOpen(true);
                          }}
                          className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1 font-bold"
                        >
                          <UserPlus size={12} /> Add 2nd Admin
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {schoolUsers.map((u: any) => (
                          <div
                            key={u._id}
                            className="bg-white p-3 rounded-lg border shadow-sm"
                          >
                            <p className="text-xs font-bold">{u.name}</p>
                            <p className="text-[10px] text-gray-400">
                              {u.email}
                            </p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL 1: ADD/EDIT SCHOOL --- */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between border-b pb-3 mb-4">
              <h2 className="text-lg font-bold">
                {editId ? "Edit School" : "New School Registration"}
              </h2>
              <button onClick={() => setIsSchoolModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSchoolSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="School Name"
                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
                value={schoolForm.name}
                onChange={(e) =>
                  setSchoolForm({ ...schoolForm, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Address"
                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
                value={schoolForm.address}
                onChange={(e) =>
                  setSchoolForm({ ...schoolForm, address: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Phone"
                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
                value={schoolForm.phone}
                onChange={(e) =>
                  setSchoolForm({ ...schoolForm, phone: e.target.value })
                }
              />

              {!editId && (
                <div className="pt-2 border-t mt-2 space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Admin Details
                  </p>
                  <input
                    type="text"
                    placeholder="Admin Name"
                    className="w-full border p-2.5 rounded-lg"
                    required
                    onChange={(e) =>
                      setSchoolForm({
                        ...schoolForm,
                        adminName: e.target.value,
                      })
                    }
                  />
                  <input
                    type="email"
                    placeholder="Admin Email"
                    className="w-full border p-2.5 rounded-lg"
                    required
                    onChange={(e) =>
                      setSchoolForm({
                        ...schoolForm,
                        adminEmail: e.target.value,
                      })
                    }
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full border p-2.5 rounded-lg"
                    required
                    onChange={(e) =>
                      setSchoolForm({
                        ...schoolForm,
                        adminPassword: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-lg font-bold mt-4"
              >
                {editId ? "Update School" : "Register School"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD 2nd ADMIN --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex justify-between border-b pb-3 mb-4 font-bold">
              <h2>Add Staff Member</h2>
              <button onClick={() => setIsUserModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border p-2.5 rounded-lg"
                required
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border p-2.5 rounded-lg"
                required
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border p-2.5 rounded-lg"
                required
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold"
              >
                Save Staff
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
