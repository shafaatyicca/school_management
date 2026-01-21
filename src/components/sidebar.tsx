"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menu = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Classes", href: "/classes", icon: BookOpen },
  { name: "Students", href: "/students", icon: Users },
  { name: "Employees", href: "/employees", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Width logic
  const sidebarWidth = isCollapsed ? "lg:w-[70px]" : "lg:w-[200px]";

  return (
    <>
      {/* 1. Mobile Trigger */}
      {!isMobileOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-[100] lg:hidden bg-[#0F172A] text-white cursor-pointer"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* 2. Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. Sidebar Main Container (Fixed Position) */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[120] h-screen transition-[width,transform] duration-300 ease-in-out flex flex-col border-r border-slate-800/60 shadow-4xl shrink-0 overflow-hidden",
          "bg-[#0F172A] text-slate-300",
          sidebarWidth,
          isMobileOpen
            ? "translate-x-0 w-[260px]"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Toggle Header */}
        <div
          className={cn(
            "flex items-center p-2 min-h-[40px] shrink-0 overflow-hidden",
            isCollapsed
              ? "justify-center"
              : "justify-end border-b border-slate-800/30",
          )}
        >
          <button
            onClick={() =>
              isMobileOpen
                ? setIsMobileOpen(false)
                : setIsCollapsed(!isCollapsed)
            }
            className="p-1.5 rounded-md bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
          >
            {isMobileOpen ? (
              <X className="h-4 w-4" />
            ) : isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-3 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar mt-4">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200 group relative w-full overflow-hidden",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 shadow-md"
                    : "hover:bg-slate-800/40 hover:text-white text-slate-400",
                  isCollapsed && "justify-center px-0 mx-auto w-12",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-all",
                    isActive
                      ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      : "group-hover:text-slate-200",
                  )}
                />

                {!isCollapsed && (
                  <span className="truncate tracking-wide whitespace-nowrap opacity-100 transition-opacity duration-300">
                    {item.name}
                  </span>
                )}

                {isCollapsed && (
                  <div className="absolute left-16 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap z-[150] border border-slate-700">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 4. ✅ INVISIBLE SPACER DIV (The Magic Fix) */}
      {/* Ye div page ke flow mein jagah leti hai taake content sidebar ke niche na jaye.
          Jab sidebar collapse hoga, ye div bhi choti ho jayegi aur content khul jayega. */}
      <div
        className={cn(
          "hidden lg:block shrink-0 transition-[width] duration-300 ease-in-out",
          sidebarWidth,
        )}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1e293b transparent;
        }
      `}</style>
    </>
  );
}
