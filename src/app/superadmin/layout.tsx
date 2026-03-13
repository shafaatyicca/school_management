"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  Settings2,
  LogOut,
  LayoutDashboard,
  Building2,
  CreditCard,
  Menu,
  UserCircle,
  Loader2,
  FileText,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium italic">
          Loading Admin Panel...
        </p>
      </div>
    );
  }

  // UPDATED MENU ITEMS: Saare paths ab clean aur direct hain
  const menuItems = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/superadmin",
    },
    {
      id: "schools",
      label: "All Schools", // Institutions ki jagah Schools kar diya
      icon: Building2,
      path: "/superadmin/schools",
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: FileText,
      path: "/superadmin/invoices",
    },
    {
      id: "subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
      path: "/superadmin/subscriptions",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"} bg-slate-900 transition-all duration-300 fixed h-full z-50 shadow-2xl`}
      >
        <div className="p-4 flex items-center gap-3 text-white border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-md">
            <Settings2 size={20} />
          </div>
          {isSidebarOpen && (
            <span className="text-md uppercase font-bold tracking-tight">
              EduControl
            </span>
          )}
        </div>

        <nav className="mt-6 px-2 space-y-2">
          {menuItems.map((item) => {
            const isActive =
              item.path === "/superadmin"
                ? pathname === "/superadmin"
                : pathname.startsWith(item.path);

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {isSidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN AREA */}
      <main
        className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}
      >
        <header className="bg-white/70 backdrop-blur-md border-b sticky top-0 z-40 px-4 py-2 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
            >
              <Menu size={20} />
            </button>

            {/* DYNAMIC TITLE: Path ke mutabiq heading */}
            <h1 className="text-md uppercase tracking-widest text-slate-600 font-bold">
              {pathname === "/superadmin" && "Dashboard Overview"}
              {pathname.startsWith("/superadmin/schools") &&
                "School Management"}
              {pathname.startsWith("/superadmin/invoices") && "Global Invoices"}
              {pathname.startsWith("/superadmin/subscriptions") &&
                "Subscription Plans"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase leading-none font-bold">
                  Super Admin
                </p>
                <p className="text-[12px] font-bold text-slate-700">
                  {session?.user?.name || "Admin"}
                </p>
              </div>
              <UserCircle size={32} className="text-slate-300" />
            </div>
            <button
              onClick={() => signOut()}
              className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-md transition-all shadow-sm cursor-pointer"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="px-3 py-2 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
