"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, ShieldAlert, Users, KeyRound, Loader2, CircleAlert } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { notify } from "@/lib/notify";
import { getSubdomain } from "@/lib/host";
import UsersTab from "@/components/user-access/UsersTab";
import RolesTab from "@/components/user-access/RolesTab";
import { card, border, muted } from "@/components/user-access/ui";

export default function UserAccessPage() {
  const { data: session, status } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [noSchool, setNoSchool] = useState(false);
  const [tab, setTab] = useState<"users" | "roles">("users");

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  // Only the first load shows "Loading…" (reloads keep the editors open)
  const [ready, setReady] = useState(false);

  // ── Fit the page to the screen (large screens): no outer scrollbar
  const rootRef = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.innerWidth < 1024) {
        setFitHeight(null); // small screens: normal scroll
        return;
      }

      // Bottom padding/border of the layout containers below this page
      let bottom = 0;
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        bottom += (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
        p = p.parentElement;
      }
      const top = el.getBoundingClientRect().top;
      setFitHeight(Math.max(420, Math.floor(window.innerHeight - top - bottom)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [status, isSuperAdmin, noSchool]);

  // ── School from the subdomain
  useEffect(() => {
    if (!isSuperAdmin) return;
    const slug = getSubdomain(window.location.hostname);
    if (slug) {
      fetch(`/api/superadmin/schools?slug=${slug}&fields=basic`)
        .then((r) => r.json())
        .then((d) => {
          if (d?._id) {
            setSchoolId(d._id);
            setSchoolName(d.name || "");
          } else setNoSchool(true);
        })
        .catch(() => setNoSchool(true));
    } else {
      setNoSchool(true);
    }
  }, [isSuperAdmin]);

  // ── Users + roles of this school
  const loadAll = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [aRes, rRes] = await Promise.all([
        fetch(`/api/superadmin/access?schoolId=${schoolId}`),
        fetch(`/api/superadmin/roles?schoolId=${schoolId}`),
      ]);
      const a = await aRes.json().catch(() => ({ message: `Users API failed (${aRes.status})` }));
      const r = await rRes.json().catch(() => ({ message: `Roles API failed (${rRes.status})` }));
      if (!aRes.ok) throw new Error(a.message || "Failed to load users");
      if (!rRes.ok) throw new Error(r.message || "Failed to load roles");
      setUsers(a.users || []);
      setRoles(Array.isArray(r) ? r : a.roles || []);
    } catch (e: any) {
      notify.error(e.message || "Failed to load");
    } finally {
      setReady(true);
    }
  }, [schoolId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // After a user is saved: replace them in the list
  const onUserSaved = useCallback((saved: any) => {
    setUsers((prev) => prev.map((u) => (String(u._id) === String(saved._id) ? saved : u)));
  }, []);

  // ── Guards
  if (status === "loading") return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-rose-500">
        <ShieldAlert className="h-8 w-8" />
        Only Super Admin can manage user access.
      </div>
    );
  }
  if (noSchool) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm" style={muted}>
        <CircleAlert className="h-8 w-8" />
        Open a school (its subdomain) to manage its users.
      </div>
    );
  }

  // Users / Roles buttons (top of the left panel)
  const tabSwitch = (
    <div className="shrink-0 grid grid-cols-2 gap-1 border-b p-1.5" style={border}>
      {[
        { key: "users", label: "Users", icon: Users, count: users.length },
        { key: "roles", label: "Roles", icon: KeyRound, count: roles.length },
      ].map((t) => {
        const Icon = t.icon;
        const on = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as "users" | "roles")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md h-8 text-xs font-semibold transition-colors cursor-pointer ${
              on ? "bg-sky-600 text-white" : "text-foreground hover:bg-[color:var(--muted)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {t.label}
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${on ? "bg-white/25" : ""}`}
              style={on ? undefined : { backgroundColor: "var(--muted)" }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-3"
      style={fitHeight ? { height: fitHeight } : undefined}
    >
      <PageHeader title="User Access" icon={<ShieldCheck className="w-4 h-4" />} />

      {!ready ? (
        <div
          className="flex items-center justify-center rounded-xl border p-10 text-sm lg:flex-1 lg:min-h-0"
          style={{ ...card, ...muted }}
        >
          <Loader2 className="inline w-4 h-4 animate-spin mr-1" /> Loading…
        </div>
      ) : (
        <>
          {/* Both stay mounted, so unsaved edits survive switching tabs */}
          <UsersTab
            schoolId={schoolId}
            users={users}
            roles={roles}
            tabSwitch={tabSwitch}
            hidden={tab !== "users"}
            onUserSaved={onUserSaved}
          />
          <RolesTab
            schoolId={schoolId}
            schoolName={schoolName}
            roles={roles}
            tabSwitch={tabSwitch}
            hidden={tab !== "roles"}
            onReload={loadAll}
          />
        </>
      )}
    </div>
  );
}