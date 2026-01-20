"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BookOpen } from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Classes", href: "/classes", icon: BookOpen },
  { name: "Students", href: "/students", icon: Users },
  { name: "Teachers", href: "/teachers", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-50 border-r p-2">
      <h1 className="text-xl font-bold mb-6">School Admin</h1>

      <nav className="space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors",
                pathname === item.href && "bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
