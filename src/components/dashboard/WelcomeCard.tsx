"use client";

import { Sparkle } from "lucide-react";

const TZ = "Asia/Karachi";

// Greeting by Pakistan time
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// e.g. "Thursday, 19 November 2026"
function todayLabel() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long", timeZone: TZ });
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  return `${weekday}, ${date}`;
}

export default function WelcomeCard({ me }: { me: any }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0a1633] via-[#0c1f45] to-[#0f2c5c] px-3 py-4 text-white shadow-sm">
      <Sparkle className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-sky-400/10" />

      <p className="text-sm font-medium text-sky-400">{todayLabel()}</p>
      <h2 className="mt-1 text-[20px] font-bold">
        {greeting()}, {me?.name || "there"}
      </h2>
      {me?.roleName && <p className="mt-1 text-sm text-slate-300">{me.roleName}</p>}
    </div>
  );
}