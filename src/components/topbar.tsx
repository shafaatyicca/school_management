"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  GraduationCap,
  Bell,
  Calendar as CalendarIcon,
  Search,
  Settings,
  KeyRound,
  UserCircle,
  User,
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

export default function Topbar() {
  const [dateTime, setDateTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    // 1. Loading state background changed to bg-background
    return (
      <header className="h-20 w-full border-b border-border bg-background sticky top-0 z-50 flex items-center px-8">
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

  return (
    // 2. Main Header: bg-background use kiya backdrop-blur ke sath
    <header className="h-20 w-full bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      {/* --- LEFT SECTION --- */}
      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer hidden sm:block">
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border shadow-xl">
            <GraduationCap className="h-6 w-6 text-sky-400" />
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-sm md:text-lg font-bold tracking-wider text-foreground leading-none">
            BRIGHT<span className="text-sky-400 italic">FUTURE</span>
            <span className="hidden md:inline ml-2 text-muted-foreground font-light text-xs">
              | MANAGEMENT
            </span>
          </h1>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border">
              <CalendarIcon className="h-3 w-3 text-sky-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                {formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
              <div className="h-1 w-1 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-sky-300 tracking-wider tabular-nums">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- MIDDLE SECTION --- */}
      <div className="hidden lg:flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em]">
          Core System Online
        </span>
      </div>

      {/* --- RIGHT SECTION --- */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 rounded-lg h-9 w-9"
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 rounded-lg h-9 w-9"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {/* 3. Notification dot ring changed to ring-background */}
            <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-sky-500 rounded-full ring-2 ring-background"></span>
          </div>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-1 pr-3 py-1 cursor-pointer bg-muted/50 hover:bg-muted transition-all rounded-xl border border-border group shadow-inner">
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden group-hover:border-sky-500/50 transition-all">
                  <User className="h-4 w-4 text-muted-foreground group-hover:text-sky-400" />
                </div>
                {/* Status dot ring changed to border-background */}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-background"></div>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-bold text-foreground leading-none tracking-wide">
                  Hassan Jani
                </p>
                <p className="text-[9px] text-sky-400/80 font-bold mt-1 uppercase tracking-tighter">
                  Super Admin
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>

          {/* 4. Dropdown content bg and border synced */}
          <DropdownMenuContent
            className="w-64 mt-2 bg-popover border-border shadow-2xl rounded-xl text-popover-foreground"
            align="end"
          >
            <DropdownMenuLabel className="font-normal p-4 bg-muted/30">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground">Ali Khan</p>
                <p className="text-xs text-muted-foreground">
                  ali.admin@school.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-sky-500/10 focus:text-sky-400 transition-colors">
                <UserCircle className="h-4 w-4" />
                <span className="text-sm">Update Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-sky-500/10 focus:text-sky-400 transition-colors">
                <KeyRound className="h-4 w-4" />
                <span className="text-sm">Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-sky-500/10 focus:text-sky-400 transition-colors">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="flex items-center gap-3 p-3 m-1 rounded-lg cursor-pointer text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/20 focus:text-rose-400 font-bold transition-colors">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
