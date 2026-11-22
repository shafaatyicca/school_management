"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  can as canPerm,
  canWidget as canWidgetPerm,
  EMPTY_PERMISSIONS,
  type Permissions,
  type ModuleKey,
  type WidgetKey,
  type Action,
} from "@/lib/permissions";

type Ctx = {
  loading: boolean;
  isSuperAdmin: boolean;
  can: (module: ModuleKey, action?: Action) => boolean;
  canWidget: (key: WidgetKey) => boolean;
  refresh: () => void;
};

const PermissionsContext = createContext<Ctx>({
  loading: true,
  isSuperAdmin: false,
  can: () => false,
  canWidget: () => false,
  refresh: () => {},
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>(EMPTY_PERMISSIONS);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me/access", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setIsSuperAdmin(!!data.isSuperAdmin);
        setPermissions(data.permissions || EMPTY_PERMISSIONS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once, and again when the user comes back to the tab
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Page actions (User Access → Pages)
  const can = useCallback(
    (module: ModuleKey, action: Action = "view") =>
      isSuperAdmin || canPerm(permissions, module, action),
    [isSuperAdmin, permissions],
  );

  // Dashboard widgets (User Access → Dashboard Widgets)
  const canWidget = useCallback(
    (key: WidgetKey) => isSuperAdmin || canWidgetPerm(permissions, key),
    [isSuperAdmin, permissions],
  );

  return (
    <PermissionsContext.Provider value={{ loading, isSuperAdmin, can, canWidget, refresh }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);