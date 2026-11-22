"use client";

import { ShieldAlert, Loader2 } from "lucide-react";
import { usePermissions } from "@/components/PermissionsProvider";
import type { ModuleKey, Action } from "@/lib/permissions";

// Shows the page only when the user has the permission; otherwise an Access Denied screen
export default function PageGuard({
  module,
  action = "view",
  children,
}: {
  module: ModuleKey;
  action?: Action;
  children: React.ReactNode;
}) {
  const { loading, can } = usePermissions();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm" style={{ color: "var(--muted-foreground)" }}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking access…
      </div>
    );
  }

  if (!can(module, action)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl border p-8 text-center"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15">
            <ShieldAlert className="h-7 w-7 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            You don&apos;t have permission to open this page.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Please contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}