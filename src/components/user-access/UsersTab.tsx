"use client";

import { useState, useMemo, useCallback } from "react";
import { Users } from "lucide-react";
import { notify } from "@/lib/notify";
import type { Permissions } from "@/lib/permissions";
import PermissionsPanel, { PanelTabs, type PanelView } from "./PermissionsPanel";
import {
  GRID,
  PANEL,
  HEADER_BAR,
  BODY,
  CONTROL,
  card,
  border,
  muted,
  clone,
  pkTime,
  listRow,
  indicator,
  PermissionSearch,
  Switch,
  SaveActions,
} from "./ui";

export default function UsersTab({
  schoolId,
  users,
  roles,
  tabSwitch,
  hidden,
  onUserSaved,
}: {
  schoolId: string | null;
  users: any[];
  roles: any[];
  tabSwitch: React.ReactNode;
  hidden?: boolean;
  onUserSaved: (user: any) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [permQuery, setPermQuery] = useState("");
  const [view, setView] = useState<PanelView>("pages");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState<any>(null); // { access, isActive, useCustom, custom }
  const [draftBase, setDraftBase] = useState(""); // last saved snapshot

  const roleById = useMemo(() => new Map(roles.map((r) => [String(r._id), r])), [roles]);

  // A user's current role (roleId, or old users: role name)
  const roleOfUser = useCallback(
    (u: any) => roleById.get(String(u.roleId)) || roles.find((r) => r.key === u.role) || null,
    [roleById, roles],
  );

  const roleLabel = (u: any) => roleOfUser(u)?.name || u.role;

  // ── Select a user → fill the editor
  const selectUser = (u: any) => {
    setSelectedUserId(String(u._id));
    const role = roleOfUser(u);
    const next = {
      access: role ? String(role._id) : "",
      isActive: u.isActive !== false,
      useCustom: !!u.useCustomPermissions,
      custom: clone(u.customPermissions || role?.permissions),
    };
    setDraft(next);
    setDraftBase(JSON.stringify(next));
  };

  const selectedUser = users.find((u) => String(u._id) === selectedUserId);
  const userDirty = !!draft && JSON.stringify(draft) !== draftBase;

  // What the tables show for the selected user
  const effective: Permissions | null = useMemo(() => {
    if (!draft) return null;
    if (draft.useCustom) return draft.custom;
    return clone(roleById.get(draft.access)?.permissions);
  }, [draft, roleById]);

  const saveUser = async () => {
    if (!selectedUser || !draft) return;
    if (!draft.access) {
      notify.error("Please choose a role");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          userId: selectedUser._id,
          access: draft.access,
          isActive: draft.isActive,
          useCustomPermissions: draft.useCustom,
          customPermissions: draft.custom,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Save failed");
      onUserSaved(json);
      setDraftBase(JSON.stringify(draft));
      notify.success(`Access updated for ${selectedUser.name}`);
    } catch (e: any) {
      notify.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={hidden ? "hidden" : GRID}>
      {/* List */}
      <div className={PANEL} style={card}>
        {tabSwitch}
        <div className="flex-1 min-h-0 max-h-[50vh] lg:max-h-none overflow-y-auto">
          {users.length === 0 ? (
            <p className="p-6 text-center text-xs" style={muted}>
              No users in this school.
            </p>
          ) : (
            users.map((u) => {
              const on = String(u._id) === selectedUserId;
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className={listRow(on)}
                  style={border}
                >
                  <span className={indicator(on)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{u.name}</span>
                    <span className="block truncate text-[10px]" style={muted}>
                      {roleLabel(u)}
                      {u.useCustomPermissions ? " · Custom" : ""}
                      {u.isActive === false ? " · Inactive" : ""}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={PANEL} style={card}>
        {!selectedUser || !draft ? (
          <div
            className="flex flex-1 min-h-[300px] flex-col items-center justify-center gap-2 text-xs"
            style={muted}
          >
            <Users className="h-8 w-8" />
            Select a user to manage their access.
          </div>
        ) : (
          <>
            {/* Header: user + Save */}
            <div className={HEADER_BAR} style={border}>
              <h2 className="min-w-0 truncate text-sm font-bold text-foreground">
                {selectedUser.name}
                <span className="ml-1.5 text-[11px] font-normal" style={muted}>
                  ({selectedUser.email} · Last login: {pkTime(selectedUser.lastLoginAt)})
                </span>
              </h2>
              <SaveActions
                dirty={userDirty}
                saving={saving}
                onDiscard={() => setDraft(JSON.parse(draftBase))}
                onSave={saveUser}
              />
            </div>

            {/* Body */}
            <div className={BODY}>
              {/* Filters: active · role · custom · Pages/Widgets · search */}
              <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto_minmax(0,1fr)] gap-2">
                <div className={CONTROL} style={border}>
                  <span className="font-semibold text-foreground">Login active</span>
                  <Switch
                    on={draft.isActive}
                    color="bg-emerald-500"
                    onChange={(v) => setDraft({ ...draft, isActive: v })}
                  />
                </div>

                <select
                  value={draft.access}
                  onChange={(e) => {
                    const access = e.target.value;
                    const role = roleById.get(access);
                    setDraft({
                      ...draft,
                      access,
                      // starting point for custom = the chosen role's permissions
                      custom: draft.useCustom ? draft.custom : clone(role?.permissions),
                    });
                  }}
                  className="h-9 rounded-lg border px-2 text-xs text-foreground cursor-pointer"
                  style={card}
                >
                  <option value="">Choose a role…</option>
                  {roles.map((r) => (
                    <option key={r._id} value={String(r._id)}>
                      {r.name}
                    </option>
                  ))}
                </select>

                {/* Note shows on hover */}
                <div
                  className={CONTROL}
                  style={border}
                  title={
                    draft.useCustom
                      ? "Custom access: these permissions apply to this user only."
                      : "Showing the role's permissions. Switch on to give this user their own permissions."
                  }
                >
                  <span className="font-semibold text-foreground">Custom access</span>
                  <Switch
                    on={draft.useCustom}
                    onChange={(v) =>
                      setDraft({
                        ...draft,
                        useCustom: v,
                        custom: v
                          ? clone(draft.custom || roleById.get(draft.access)?.permissions)
                          : draft.custom,
                      })
                    }
                  />
                </div>

                {effective && <PanelTabs value={effective} view={view} onView={setView} />}

                <PermissionSearch value={permQuery} onChange={setPermQuery} />
              </div>

              {/* Table (fills the rest, scrolls inside) */}
              {effective && (
                <PermissionsPanel
                  value={effective}
                  readOnly={!draft.useCustom}
                  query={permQuery}
                  view={view}
                  onChange={(custom) => setDraft({ ...draft, custom })}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}