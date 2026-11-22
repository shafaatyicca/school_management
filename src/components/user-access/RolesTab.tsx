"use client";

import { useState, useMemo } from "react";
import { KeyRound, Plus, Trash2, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { notify } from "@/lib/notify";
import { EMPTY_PERMISSIONS, type Permissions } from "@/lib/permissions";
import PermissionsPanel, { PanelTabs, type PanelView } from "./PermissionsPanel";
import {
  GRID,
  PANEL,
  HEADER_BAR,
  BODY,
  card,
  border,
  muted,
  clone,
  listRow,
  indicator,
  PermissionSearch,
  SaveActions,
} from "./ui";

export default function RolesTab({
  schoolId,
  schoolName,
  roles,
  tabSwitch,
  hidden,
  onReload,
}: {
  schoolId: string | null;
  schoolName: string;
  roles: any[];
  tabSwitch: React.ReactNode;
  hidden?: boolean;
  onReload: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [permQuery, setPermQuery] = useState("");
  const [view, setView] = useState<PanelView>("pages");
  const [selectedRoleId, setSelectedRoleId] = useState(""); // "new" = creating
  const [roleDraft, setRoleDraft] = useState<{ name: string; permissions: Permissions } | null>(null);
  const [roleBase, setRoleBase] = useState("");
  const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);

  const roleById = useMemo(() => new Map(roles.map((r) => [String(r._id), r])), [roles]);

  const selectRole = (id: string) => {
    setSelectedRoleId(id);
    if (id === "new") {
      const next = { name: "", permissions: clone(EMPTY_PERMISSIONS) };
      setRoleDraft(next);
      setRoleBase(JSON.stringify(next));
      return;
    }
    const r = roleById.get(id);
    const next = r ? { name: r.name, permissions: clone(r.permissions) } : null;
    setRoleDraft(next);
    setRoleBase(next ? JSON.stringify(next) : "");
  };

  const selectedRole = selectedRoleId !== "new" ? roleById.get(selectedRoleId) : null;
  const roleDirty = !!roleDraft && JSON.stringify(roleDraft) !== roleBase;

  const saveRole = async () => {
    if (!roleDraft) return;
    if (!roleDraft.name.trim()) {
      notify.error("Role name is required");
      return;
    }
    setSaving(true);
    try {
      const isNew = selectedRoleId === "new";
      const res = await fetch("/api/superadmin/roles", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { schoolId, name: roleDraft.name, permissions: roleDraft.permissions }
            : { schoolId, id: selectedRoleId, name: roleDraft.name, permissions: roleDraft.permissions },
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Save failed");
      notify.success(isNew ? "Role created" : "Role updated for this school");
      setRoleBase(JSON.stringify(roleDraft));
      await onReload();
      setSelectedRoleId(String(json._id));
    } catch (e: any) {
      notify.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    try {
      const res = await fetch("/api/superadmin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, id: selectedRoleId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Delete failed");
      notify.success("Role deleted");
      setSelectedRoleId("");
      setRoleDraft(null);
      setRoleBase("");
      await onReload();
    } catch (e: any) {
      notify.error(e.message || "Delete failed");
    } finally {
      setDeleteRoleOpen(false);
    }
  };

  return (
    <>
      <div className={hidden ? "hidden" : GRID}>
        {/* List */}
        <div className={PANEL} style={card}>
          {tabSwitch}
          {/* New Role (stays on top) */}
          <button
            type="button"
            onClick={() => selectRole("new")}
            className={`shrink-0 flex w-full items-center justify-center gap-1.5 border-b px-3 py-2 text-[11px] font-semibold cursor-pointer transition-colors ${
              selectedRoleId === "new"
                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                : "text-sky-600 dark:text-sky-400 hover:bg-[color:var(--muted)]"
            }`}
            style={border}
          >
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
          <div className="flex-1 min-h-0 max-h-[50vh] lg:max-h-none overflow-y-auto">
            {roles.map((r) => {
              const on = String(r._id) === selectedRoleId;
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => selectRole(String(r._id))}
                  className={listRow(on)}
                  style={border}
                >
                  <span className={indicator(on)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{r.name}</span>
                    <span className="block truncate text-[10px]" style={muted}>
                      {r.isSystem ? "Default role" : "Custom role"} · {r.userCount ?? 0} user(s)
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className={PANEL} style={card}>
          {!roleDraft ? (
            <div
              className="flex flex-1 min-h-[300px] flex-col items-center justify-center gap-2 text-xs"
              style={muted}
            >
              <KeyRound className="h-8 w-8" />
              Select a role, or create a new one.
            </div>
          ) : (
            <>
              {/* Header: role name · Pages/Widgets · search · Delete · Save */}
              <div className={HEADER_BAR} style={border}>
                <input
                  value={roleDraft.name}
                  onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })}
                  placeholder="Role name (e.g. Receptionist)"
                  className="h-9 min-w-[160px] flex-1 max-w-xs rounded-lg border px-3 text-sm font-semibold text-foreground outline-none focus:border-sky-500"
                  style={card}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <PanelTabs value={roleDraft.permissions} view={view} onView={setView} />
                  <div className="w-full sm:w-48">
                    <PermissionSearch value={permQuery} onChange={setPermQuery} />
                  </div>
                  {selectedRole && !selectedRole.isSystem && (
                    <Button
                      variant="ghost"
                      onClick={() => setDeleteRoleOpen(true)}
                      className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  )}
                  <SaveActions
                    dirty={roleDirty}
                    saving={saving}
                    onDiscard={() => setRoleDraft(JSON.parse(roleBase))}
                    onSave={saveRole}
                    saveLabel={selectedRoleId === "new" ? "Create Role" : "Save"}
                  />
                </div>
              </div>

              {/* Body: note + table */}
              <div className={BODY}>
                <p className="shrink-0 flex items-center gap-1.5 text-[11px] leading-tight text-amber-600 dark:text-amber-400">
                  <CircleAlert className="w-3.5 h-3.5 shrink-0" />
                  {selectedRoleId === "new"
                    ? "Tick the pages and widgets for this role, then create it."
                    : `Changes apply to ${selectedRole?.userCount ?? 0} user(s) with this role in ${
                        schoolName || "this school"
                      } only.`}
                </p>

                <PermissionsPanel
                  value={roleDraft.permissions}
                  query={permQuery}
                  view={view}
                  onChange={(permissions) => setRoleDraft({ ...roleDraft, permissions })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteRoleOpen}
        onOpenChange={setDeleteRoleOpen}
        onConfirm={deleteRole}
        itemName={selectedRole ? `the role "${selectedRole.name}"` : ""}
      />
    </>
  );
}