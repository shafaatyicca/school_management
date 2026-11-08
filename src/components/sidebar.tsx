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
  GraduationCap,
  UsersRound,
  BriefcaseBusiness,
  WalletCards,
  ChevronDown,
  ReceiptText,
  Ticket,
  UserPlus,
  Contact,
  FileText,
  BookUser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

const HOVER =
  "hover:bg-gradient-to-r hover:from-sky-500/60 hover:to-transparent hover:text-white";

  const ACTIVE = "bg-gradient-to-r from-sky-500/60 to-transparent text-white";

export default function Sidebar() {
  const { data: session } = useSession();
  const params = useParams();
  const schoolId = params.schoolId || session?.user?.schoolId;
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false); // Expand on hover while collapsed
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Each dropdown remembers its own open/closed state
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // When collapsed and hovered, show the full width
  const isFullyExpanded = !isCollapsed || isHovered;
  const sidebarWidth = isFullyExpanded ? "lg:w-[220px]" : "lg:w-[70px]";

  const menu = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Classes", href: "/classes", icon: BookOpen },
    {
      name: "Students Management",
      icon: GraduationCap,
      isDropdown: true,
      subItems: [
        { name: "Add Student", href: "/students", icon: UserPlus },
        { name: "Student Information", href: "/student-information", icon: Contact },
        { name: "Admission Form", href: "/admission-form", icon: FileText },
        { name: "Student Bio Data", href: "/student-bio-data", icon: BookUser },
      ],
    },
    { name: "Employees", href: "/employees", icon: BriefcaseBusiness },
    { name: "Parents", href: "/parents", icon: UsersRound },
    {
      name: "Fee Management",
      icon: WalletCards,
      isDropdown: true,
      subItems: [
        { name: "Fee Categories", href: "/fee-categories", icon: WalletCards },
        { name: "Student Fee Ledger", href: "/student-fee-ledger", icon: ReceiptText },
        { name: "Fee Voucher Printing", href: "/fee-voucher", icon: Ticket },
      ],
    },
  ];

  return (
    <>
      {/* 1. Mobile Trigger */}
      {!isMobileOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-[9999] lg:hidden bg-[#020617] text-white border-slate-800 cursor-pointer"
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
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed top-0 left-0 z-[120] h-screen transition-[width,transform] duration-300 ease-in-out flex flex-col border-r border-white/5 shadow-2xl overflow-visible",
          "bg-[#020617] text-slate-100",
          sidebarWidth,
          isMobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Floating collapse button */}
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
          <div className="absolute inset-0 rounded-full bg-sky-500/5 animate-pulse group-hover:bg-sky-500/10" />
          {!isCollapsed ? (
            <ChevronLeft className="h-4 w-4 text-sky-400 group-hover:text-white transition-colors relative z-10" />
          ) : (
            <ChevronRight className="h-4 w-4 text-sky-400 group-hover:text-white transition-colors relative z-10" />
          )}
          <span className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping opacity-20 group-hover:opacity-40" />
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-1 overflow-y-auto overflow-x-hidden custom-scrollbar pt-3 space-y-0.5">
          {menu.map((item) => {
            const Icon = item.icon;

            // ===== DROPDOWN (Students Management, Fee Management, ...) =====
            if (item.isDropdown) {
              const isAnySubItemActive = item.subItems!.some((sub) => pathname === sub.href);
              // Open if the user opened it, or if one of its pages is active
              const isOpen = openMenus[item.name] ?? isAnySubItemActive;

              return (
                <div key={item.name} className="w-full space-y-0.5">
                  {/* Parent button */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenus((prev) => ({ ...prev, [item.name]: !isOpen }))
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-300 group relative w-full text-left cursor-pointer",
                      isAnySubItemActive ? "text-sky-400" : "text-slate-100",
                      HOVER,
                      !isFullyExpanded && "justify-center px-0 mx-auto w-10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-300 relative z-10",
                        isAnySubItemActive
                          ? "text-sky-300 drop-shadow-[0_0_10px_rgba(14,165,233,0.8)] scale-110"
                          : "group-hover:text-white",
                      )}
                    />
                    {isFullyExpanded && (
                      <>
                        <span className="flex-1 truncate tracking-wide z-10">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-300 text-slate-400 group-hover:text-white",
                            isOpen && "rotate-180",
                          )}
                        />
                      </>
                    )}

                    {/* Tooltip when collapsed */}
                    {!isFullyExpanded && (
                      <div className="absolute left-14 invisible group-hover:visible opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-[150] border border-slate-800 font-semibold">
                        {item.name}
                      </div>
                    )}
                  </button>

                  {/* Submenu links */}
                  {isOpen && isFullyExpanded && (
                    <div className="pl-3 space-y-0.5 transition-all duration-300">
                      {item.subItems!.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-300 group relative w-full",
                              isSubActive
                                ? ACTIVE
                                : cn("text-slate-300", HOVER),
                            )}
                          >
                            {SubIcon && (
                              <SubIcon
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-colors",
                                  isSubActive
                                    ? "text-sky-400"
                                    : "text-slate-400 group-hover:text-white",
                                )}
                              />
                            )}
                            <span className="truncate tracking-wide z-10">{sub.name}</span>

                            {isSubActive && (
                              <div className="absolute left-0 bg-sky-500 rounded-r-full w-[3px] h-8 shadow-[0_0_12px_rgba(14,165,233,1)]" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ===== FLAT LINKS (Dashboard, Classes, Employees, Parents ...) =====
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-300 group relative w-full",
                  isActive
                    ? ACTIVE
                    : cn("text-slate-100", HOVER),
                  !isFullyExpanded && isActive && "bg-sky-500/15 border border-sky-500/20",
                  !isFullyExpanded && "justify-center px-0 mx-auto w-10",
                )}
              >
                {isActive && !isFullyExpanded && (
                  <div className="absolute inset-0 bg-sky-500/10 blur-lg rounded-full animate-pulse" />
                )}

                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-300 relative z-10",
                    isActive
                      ? "text-sky-300 drop-shadow-[0_0_10px_rgba(14,165,233,0.8)] scale-110"
                      : "group-hover:text-white",
                  )}
                />

                {isFullyExpanded && (
                  <span className="truncate tracking-wide z-10">{item.name}</span>
                )}

                {isActive && (
                  <div className="absolute left-0 bg-sky-500 rounded-r-full w-[3px] h-8 shadow-[0_0_12px_rgba(14,165,233,1)]" />
                )}

                {!isFullyExpanded && (
                  <div className="absolute left-14 invisible group-hover:visible opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-[150] border border-slate-800 font-semibold">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Layout spacer */}
      <div
        className={cn(
          "hidden lg:block shrink-0 transition-[width] duration-300",
          isCollapsed ? "lg:w-[70px]" : "lg:w-[220px]",
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