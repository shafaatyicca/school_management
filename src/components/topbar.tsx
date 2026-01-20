"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-6">
      <span className="font-semibold">Dashboard</span>

      <Button
        size="sm"
        variant="outline"
        className="flex items-center gap-2 cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </header>
  );
}
