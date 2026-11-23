"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  GraduationCap,
  Bell,
  Calendar as CalendarIcon,
  Search,
  Settings,
  UserCircle,
  User,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/siteTheme/ThemeToggle";
import { useRouter } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import { getSubdomain, mainUrl } from "@/lib/host";

type SchoolInfo = { _id?: string; name: string; updatedAt?: string };

export default function Topbar() {
  const [dateTime, setDateTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const { data: session } = useSession();
  const params = useParams();

  const [schoolData, setSchoolData] = useState<SchoolInfo | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Light school info (name only) — the logo is loaded separately as a cached image
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      const currentSchoolId =
        (params?.schoolId as string) || session?.user?.schoolId;

      let url = "";
      if (currentSchoolId) {
        url = `/api/superadmin/schools?id=${currentSchoolId}&fields=basic`;
      } else {
       const slug = getSubdomain(window.location.hostname);
        if (slug) {
          url = `/api/superadmin/schools?slug=${slug}&fields=basic`;
        }
      }

      if (!url) {
        setSchoolData({ name: "SYSTEM CONTROL" });
        return;
      }

      try {
        const res = await fetch(url);
        if (res.ok) {
          setSchoolData(await res.json());
          setLogoFailed(false);
        }
      } catch (err) {
        console.error("Error fetching school info:", err);
      }
    };

    fetchSchoolInfo();
  }, [params?.schoolId, session?.user?.schoolId]);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <header className="h-20 w-full border-b border-border bg-background sticky top-0 z-50 flex items-center px-6">
        <div className="animate-pulse bg-muted h-10 w-48 rounded-lg" />
      </header>
    );
  }

  const formattedDate = dateTime.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const formattedTime = dateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Cached logo URL (changes whenever the school is updated)
  const logoUrl =
    schoolData?._id && !logoFailed
      ? `/api/superadmin/schools?logo=1&id=${schoolData._id}&v=${encodeURIComponent(
          schoolData.updatedAt || "",
        )}`
      : "";

  return (
          <header className="sticky top-0 z-50 h-18 w-full flex items-center justify-between px-6 border-b-2 border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
      {/* --- LEFT SECTION --- */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Logo: any shape fits fully (contain + padding) */}
        <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-1 shadow-sm ring-1 ring-sky-500/10 overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="School Logo"
              className="max-h-full max-w-full object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <GraduationCap className="h-6 w-6 text-sky-500" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h3 className="truncate text-[11px] md:text-lg tracking-wider text-foreground leading-none">
            {schoolData?.name ? schoolData.name.toUpperCase() : "School Name"}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border">
              <CalendarIcon className="h-3 w-3 text-sky-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                {formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
              <div className="h-1 w-1 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-300 tracking-wider tabular-nums">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- MIDDLE SECTION --- */}
      <div className="flex items-center justify-center">
        {session?.user?.role === "super_admin" ? (
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 animate-in fade-in zoom-in duration-500">
            <button
              onClick={() =>
                 window.location.replace(mainUrl("/superadmin"))
              }
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-100 hover:text-indigo-600 transition-colors group cursor-pointer"
            >
              <ArrowLeft
                size={12}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Back to Super Admin
            </button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em]">
              System Online
            </span>
          </div>
        )}
      </div>

      {/* --- RIGHT SECTION --- */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            title="Search (Ctrl + K)"
            className="text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 rounded-full h-9 w-9 cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 rounded-full h-9 w-9"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-sky-500 rounded-full ring-2 ring-background"></span>
          </div>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-1 pr-3 py-1 cursor-pointer bg-muted/50 hover:bg-muted transition-all rounded-md border border-border group shadow-inner">
              <div className="relative">
                <div className="h-10 w-10 rounded-md bg-card border border-border flex items-center justify-center overflow-hidden group-hover:border-sky-500/50 transition-all">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground group-hover:text-sky-400" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-background"></div>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-bold text-foreground leading-none tracking-wide">
                  {session?.user?.name || "User Name"}
                </p>
                <p className="text-[9px] text-sky-500 dark:text-sky-400/80 font-bold mt-1 uppercase tracking-tighter">
                  {session?.user?.role?.replace("_", " ") || "Admin"}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-50 mt-1 bg-popover border-border shadow-2xl rounded-md text-popover-foreground"
            align="end"
          >
            <DropdownMenuLabel className="font-normal p-4 bg-muted/30">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground uppercase">
                  {session?.user?.name || "Admin User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email || "email@school.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-sky-500/10 focus:text-sky-400 transition-colors">
                <UserCircle className="h-4 w-4" />
                <span className="text-sm">Update Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-sky-500/10 focus:text-sky-400 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 p-3 m-1 rounded-lg cursor-pointer text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/20 focus:text-rose-400 font-bold transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}