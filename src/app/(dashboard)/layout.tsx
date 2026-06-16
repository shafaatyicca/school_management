"use client";

import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      router.refresh();
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-slate-500 italic">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Prevent flashing Sidebar/Topbar if not authenticated
  if (status !== "authenticated") return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full pt-0">{children}</div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
