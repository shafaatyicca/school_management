import { UserPlus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface AdminListProps {
  users: any[];
  onAddAdmin: () => void;
  onEditAdmin: (user: any) => void;
  onDeleteAdmin: (id: string) => void;
}

export const AdminList = ({
  users,
  onAddAdmin,
  onEditAdmin,
  onDeleteAdmin,
}: AdminListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const handleDeleteClick = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    onDeleteAdmin(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <div className="bg-slate-50/50 border-t border-slate-100 p-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-bold text-slate-800">Administrative Access</h4>
        </div>
        <button
          onClick={onAddAdmin}
          className="bg-white border border-slate-200 text-indigo-600 p-2 rounded-md flex items-center gap-2 text-xs font-bold hover:border-indigo-600 transition-all shadow-sm"
        >
          <UserPlus size={14} /> Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.length > 0 ? (
          users.map((u) => (
            <div
              key={u._id}
              className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group/user"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {u.name.charAt(0)}
                </div>
                <div className="max-w-[120px]">
                  <p className="font-bold text-slate-800 truncate text-xs">
                    {u.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {u.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditAdmin(u)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteClick(u._id, u.name)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">
            No admins found for this school.
          </p>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingName}
      />
    </div>
  );
};
