"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

type ClassType = {
  _id: string;
  name: string;
  sections: string[];
};

export default function ClassManager() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [open, setOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassType | undefined>();
  const [name, setName] = useState("");
  const [sections, setSections] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true); // ✅ Loading state for fetching

  const isEdit = Boolean(editClass);

  const fetchClasses = async () => {
    setFetchLoading(true); // ✅ Start loading
    try {
      const res = await fetch("/api/classes");
      setClasses(await res.json());
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setFetchLoading(false); // ✅ Stop loading
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (editClass) {
      setName(editClass.name);
      setSections(editClass.sections.join(","));
    } else {
      setName("");
      setSections("");
    }
  }, [editClass, open]);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const sectionsArray = sections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await fetch("/api/classes", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editClass?._id,
        name,
        sections: sectionsArray,
      }),
    });

    setLoading(false);
    setOpen(false);
    setEditClass(undefined);
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class?")) return;

    await fetch("/api/classes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    fetchClasses();
  };

  const handleAddNew = () => {
    setEditClass(undefined);
    setOpen(true);
  };

  const handleEdit = (cls: ClassType) => {
    setEditClass(cls);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Classes</h2>
        <Button onClick={handleAddNew} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
        {fetchLoading ? (
          // ✅ Loading state
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : classes.length === 0 ? (
          // ✅ Empty state
          <div className="text-center py-12 text-gray-500">
            No classes found. Add your first class!
          </div>
        ) : (
          // ✅ Table with data
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-600">
                  S#
                </th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">
                  Class
                </th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">
                  Sections
                </th>
                <th className="p-3 text-right text-sm font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {classes.map((cls, index) => (
                <tr
                  key={cls._id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 text-sm text-gray-700">{index + 1}</td>
                  <td className="p-3 text-sm font-medium text-gray-800">
                    {cls.name}
                  </td>
                  <td className="p-3 text-sm text-gray-700">
                    {cls.sections.join(", ")}
                  </td>

                  <td className="p-3 text-right flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleEdit(cls)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      className="border-red-300 hover:bg-red-50 cursor-pointer"
                      onClick={() => handleDelete(cls._id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitHandler} className="space-y-4">
            <Input
              placeholder="Class Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              placeholder="Sections (A,B,C)"
              value={sections}
              onChange={(e) => setSections(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="cursor-pointer">
                  Cancel
                </Button>
              </DialogClose>

              <Button
                type="submit"
                disabled={loading}
                className="cursor-pointer"
              >
                {loading ? "Saving..." : isEdit ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
