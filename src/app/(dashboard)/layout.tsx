"use client";

import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* 1. Sidebar (Fixed & Persistent) */}
      <Sidebar />

      {/* 2. Main Content Container */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Topbar: Fixed at top */}
        <Topbar />

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
          {/* pt-0 is crucial here for the sticky header to not jump */}
          <div className="max-w-[1600px] mx-auto w-full pt-0">{children}</div>
        </main>
      </div>

      {/* Custom Styles for Scrollbar */}
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
