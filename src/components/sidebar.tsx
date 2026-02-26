"use client";

import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
  UsersRound,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const params = useParams();
  const schoolId = params.schoolId || session?.user?.schoolId;
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidth = isCollapsed ? "lg:w-[70px]" : "lg:w-[220px]";

  const menu = [
    { name: "Dashboard", href: `/${schoolId}`, icon: LayoutDashboard },
    { name: "Classes", href: `/${schoolId}/classes`, icon: BookOpen },
    { name: "Students", href: `/${schoolId}/students`, icon: GraduationCap },
    {
      name: "Employees",
      href: `/${schoolId}/employees`,
      icon: BriefcaseBusiness,
    },
    { name: "Parents", href: `/${schoolId}/parents`, icon: UsersRound },
  ];

  return (
    <>
      {/* 1. Mobile Trigger */}
      {!isMobileOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-[100] lg:hidden bg-[#020617] text-white border-slate-800 cursor-pointer"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* 2. Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. Sidebar Main Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[120] h-screen transition-[width,transform] duration-300 ease-in-out flex flex-col border-r border-white/5 shadow-2xl overflow-visible",
          "bg-[#020617] text-slate-400",
          sidebarWidth,
          isMobileOpen
            ? "translate-x-0 w-[260px]"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Stylish Floating Collapse Button */}
        {/* Modern Floating Central Collapse Button */}
        <button
          onClick={() =>
            isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed)
          }
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2 z-[130] hidden lg:flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500 cursor-pointer group",
            "bg-[#020617] border border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.2)]",
            "hover:border-sky-400 hover:shadow-[0_0_30px_rgba(14,165,233,0.6)] hover:scale-110",
          )}
        >
          {/* Inner Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-sky-500/5 animate-pulse group-hover:bg-sky-500/10" />

          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-sky-400 group-hover:text-white transition-colors relative z-10" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-sky-400 group-hover:text-white transition-colors relative z-10" />
          )}

          {/* Exterior Pulse Ring (Optional but looks cool) */}
          <span className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping opacity-20 group-hover:opacity-40" />
        </button>

        {/* Navigation Items - Starting directly from Top with small top margin */}
        <nav className="flex-1 w-full px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar pt-3">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-300 group relative w-full",
                  isActive
                    ? "bg-gradient-to-r from-sky-500/20 to-transparent text-sky-400"
                    : "hover:bg-white/[0.03] hover:text-slate-200 text-slate-400",
                  // Collapse mode mein active item ko highlight karne ke liye background
                  isCollapsed &&
                    isActive &&
                    "bg-sky-500/15 border border-sky-500/20",
                  isCollapsed && "justify-center px-0 mx-auto w-10",
                )}
              >
                {/* Collapse mode mein Icon ke peeche glow (sirf active ke liye) */}
                {isActive && isCollapsed && (
                  <div className="absolute inset-0 bg-sky-500/10 blur-lg rounded-full animate-pulse" />
                )}

                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-all duration-300 relative z-10",
                    isActive
                      ? "text-sky-300 drop-shadow-[0_0_10px_rgba(14,165,233,0.8)] scale-110"
                      : "group-hover:text-slate-200",
                  )}
                />

                {!isCollapsed && (
                  <span className="truncate tracking-wide z-10">
                    {item.name}
                  </span>
                )}

                {/* Vertical Active Bar - Ab ye expanded aur collapsed dono mein nazar aaye ga */}
                {isActive && (
                  <div
                    className={cn(
                      "absolute left-0 bg-sky-500 rounded-r-full shadow-[0_0_12px_rgba(14,165,233,1)] transition-all",
                      isCollapsed ? "w-[3px] h-8" : "w-[3px] h-8", // Collapse mein line bari aur moti kar di
                    )}
                  />
                )}

                {/* Tooltip for Collapsed State */}
                {isCollapsed && (
                  <div className="absolute left-14 invisible group-hover:visible opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-[150] border border-slate-800 font-semibold">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={cn(
          "hidden lg:block shrink-0 transition-[width] duration-300",
          sidebarWidth,
        )}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
        .custom-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
