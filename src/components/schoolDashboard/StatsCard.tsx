"use client";

import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant: "sky" | "emerald" | "amber" | "rose";
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant,
  className,
}: StatsCardProps) {
  const variantStyles = {
    sky: "bg-sky-600 text-white dark:bg-card dark:text-card-foreground dark:border-sky-500/20",
    emerald:
      "bg-emerald-600 text-white dark:bg-card dark:text-card-foreground dark:border-emerald-500/20",
    amber:
      "bg-amber-600 text-white dark:bg-card dark:text-card-foreground dark:border-amber-500/20",
    rose: "bg-purple-600 text-white dark:bg-card dark:text-card-foreground dark:border-purple-500/20",
  };

  const iconStyles = {
    sky: "bg-white/20 text-white dark:bg-sky-500/10 dark:text-sky-400",
    emerald:
      "bg-white/20 text-white dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-white/20 text-white dark:bg-amber-500/10 dark:text-amber-400",
    rose: "bg-white/20 text-white dark:bg-purple-500/10 dark:text-purple-400",
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-300 
        light:border-transparent 
        ${variantStyles[variant]} 
        ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 dark:text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-medium italic">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${iconStyles[variant]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
