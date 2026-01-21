"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  GraduationCap,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  User,
  Search,
  Settings,
  KeyRound,
  UserCircle,
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

export default function Topbar() {
  const [dateTime, setDateTime] = useState(new Date());
  const [mounted, setMounted] = useState(false); // Hydration error fix karne ke liye

  useEffect(() => {
    setMounted(true); // Component mount hone par true hoga
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Server par render nahi hoga, sirf client par load hone ke baad dikhega
  if (!mounted) {
    return (
      <header className="h-20 w-full border-b border-slate-200/60 bg-white sticky top-0 z-50 flex items-center px-8">
        <div className="animate-pulse bg-slate-100 h-10 w-48 rounded-lg" />
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

  return (
    <header className="h-20 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-3 sticky top-0 z-50">
      {/* --- LEFT SECTION: Logo & Info --- */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
          <div className="relative flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm">
            <GraduationCap className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-base md:text-xl font-black tracking-tight text-slate-800 leading-none">
            BRIGHT<span className="text-indigo-600 italic">FUTURE</span>
            <span className="hidden sm:inline ml-1 text-slate-400 font-light">
              | ACADEMY
            </span>
          </h1>

          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
              <CalendarIcon className="h-3 w-3 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                {formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-0.5 rounded-full shadow-lg">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-medium text-emerald-50 tracking-widest tabular-nums">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="hidden lg:flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
          System Active
        </span>
      </div>

      {/* --- RIGHT SECTION: Actions & Profile Dropdown --- */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 rounded-full"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 md:gap-3 p-1 pr-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all rounded-full border border-slate-200 group">
              <div className="relative">
                <div className="h-9 w-9 rounded-full ring-2 ring-indigo-50 border-2 border-white bg-indigo-100 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-bold text-slate-800 leading-none">
                  Admin Panel
                </p>
                <p className="text-[10px] text-indigo-500 font-semibold mt-0.5 uppercase tracking-tighter">
                  Super Admin
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 mt-2 shadow-2xl border-slate-200 rounded-xl overflow-hidden"
            align="end"
          >
            <DropdownMenuLabel className="font-normal p-4 bg-slate-50/50">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-slate-900">
                  Ali Khan
                </p>
                <p className="text-xs leading-none text-slate-500">
                  ali.admin@school.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600">
                <UserCircle className="h-4 w-4" />
                <span className="font-medium text-sm">Update Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600">
                <KeyRound className="h-4 w-4" />
                <span className="font-medium text-sm">Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600">
                <Settings className="h-4 w-4" />
                <span className="font-medium text-sm">System Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-none cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700 font-bold">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
