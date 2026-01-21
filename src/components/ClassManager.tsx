"use client";

import { useEffect, useState, useMemo } from "react";
import { Pencil, Trash2, BookOpen, ArrowDown10, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
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
  order: number;
};

export default function ClassManager() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [open, setOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassType | undefined>();
  const [name, setName] = useState("");
  const [sections, setSections] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // --- Order Management States ---
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [orderMap, setOrderMap] = useState<{ [key: string]: number }>({});

  const isEdit = Boolean(editClass);

  const fetchClasses = async () => {
    setFetchLoading(true);
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      setClasses(data);

      // Yahan orderMap ko refresh karna zaroori hai taake UI 0 na dikhaye
      const map: { [key: string]: number } = {};
      data.forEach((cls: ClassType) => {
        map[cls._id] = cls.order || 0;
      });
      setOrderMap(map);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setFetchLoading(false);
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

  // Bulk Save Order Handler
  const handleBulkOrderSave = async () => {
    setLoading(true);
    try {
      const items = Object.entries(orderMap).map(([id, order]) => ({
        id,
        order: Number(order), // Ensure it's a number
      }));

      const res = await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        setIsOrderMode(false);
        await fetchClasses(); // Wait for fresh data
      }
    } catch (error) {
      console.error("Failed to save order", error);
    } finally {
      setLoading(false);
    }
  };

  // --- MRT COLUMNS DEFINITION ---
  const columns = useMemo<MRT_ColumnDef<ClassType>[]>(
    () => [
      {
        header: "S#",
        size: 50,
        enableColumnActions: false,
        enableHiding: false,
        // Ye hamesha 1, 2, 3 hi dikhayega (Static count)
        Cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "name",
        header: "Class Name",
        size: 150,
        Cell: ({ cell }) => (
          <span className="font-semibold text-slate-700">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "sections",
        header: "Sections",
        size: 200,
        Cell: ({ cell }) => (
          <div className="flex gap-1 flex-wrap">
            {cell.getValue<string[]>().map((s, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold"
              >
                {s}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "order",
        header: "Sort Order",
        size: 100,
        // Ye column user control karega sorting ke liye
        Cell: ({ row }) =>
          isOrderMode ? (
            <Input
              type="number"
              className="w-16 h-8 border-blue-400 focus-visible:ring-blue-500 font-bold text-center"
              value={orderMap[row.original._id] || 0}
              onChange={(e) =>
                setOrderMap({
                  ...orderMap,
                  [row.original._id]: parseInt(e.target.value) || 0,
                })
              }
            />
          ) : (
            <div className="flex items-center gap-2 text-blue-600 font-mono font-bold px-2">
              <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {row.original.order || 0}
              </span>
            </div>
          ),
      },
    ],
    [isOrderMode, orderMap], // Dependencies lazmi check karein
  );
  const table = useMaterialReactTable({
    columns,
    data: classes,
    state: { isLoading: fetchLoading },
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    initialState: { density: "compact" },
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-gray-300 hover:bg-gray-100 cursor-pointer"
          onClick={() => handleEdit(row.original)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-red-200 hover:bg-red-50 cursor-pointer"
          onClick={() => handleDelete(row.original._id)}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </Button>
      </div>
    ),
    // Naya Section: Toolbar mein Buttons
    renderTopToolbarCustomActions: () => (
      <div className="flex gap-2">
        {!isOrderMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOrderMode(true)}
            className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
          >
            <ArrowDown10 className="w-4 h-4 mr-2" />
            Set Ordering
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleBulkOrderSave}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Order"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOrderMode(false)}
              className="cursor-pointer"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "10px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: "700",
        fontSize: "13px",
        backgroundColor: "#f8fafc",
        color: "#64748b",
      },
    },
  });

  // --- HANDLERS ---
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
    <div className="space-y-1">
      <PageHeader
        title="Classes Management"
        buttonLabel="Add Class"
        onButtonClick={handleAddNew}
        icon={<BookOpen className="w-3.5 h-3.5" />}
      />

      <div className="w-full">
        <MaterialReactTable table={table} />
      </div>

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
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEdit ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
