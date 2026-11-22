"use client";

import { GraduationCap, UserCheck, Users } from "lucide-react";

// Static classes so Tailwind keeps them
const TONES = {
  sky: {
    box: "bg-sky-50 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20",
    label: "text-sky-700 dark:text-sky-300",
    icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  },
  emerald: {
    box: "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    label: "text-emerald-700 dark:text-emerald-300",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  violet: {
    box: "bg-violet-50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20",
    label: "text-violet-700 dark:text-violet-300",
    icon: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  },
} as const;

// Gender colors (left = boys / male, right = girls / female)
const MALE_COLOR = "text-blue-600 dark:text-blue-300";
const FEMALE_COLOR = "text-amber-500 dark:text-amber-300";

function Tile({
  label,
  value,
  tone,
  icon: Icon,
  footer,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
  icon: React.ElementType;
  footer?: { leftLabel: string; left: number; rightLabel: string; right: number };
}) {
  const t = TONES[tone];
  return (
    <div className={`flex flex-col justify-between rounded-xl border px-3 py-2 ${t.box}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}>{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{value.toLocaleString()}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {footer && (
        <div className="mt-1 flex items-center justify-between text-[11px] font-medium">
          <span className={MALE_COLOR}>
            {footer.leftLabel}: <b>{footer.left.toLocaleString()}</b>
          </span>
          <span className={FEMALE_COLOR}>
            {footer.rightLabel}: <b>{footer.right.toLocaleString()}</b>
          </span>
        </div>
      )}
    </div>
  );
}

export default function SchoolTotals({ data }: { data: any }) {
  const active = Number(data?.studentsActive || 0);
  const boys = Number(data?.boys || 0);
  const girls = Number(data?.girls || 0);
  const parents = Number(data?.parents || 0);
  const teachers = Number(data?.teachers || 0);
  const staff = teachers + Number(data?.otherStaff || 0);
  const staffMale = Number(data?.staffMale || 0);
  const staffFemale = Number(data?.staffFemale || 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Tile
        label="Active Students"
        value={active}
        tone="sky"
        icon={GraduationCap}
        footer={{ leftLabel: "Boys", left: boys, rightLabel: "Girls", right: girls }}
      />
      <Tile label="Total Parents" value={parents} tone="emerald" icon={UserCheck} />
      <Tile
        label={`Staff · ${teachers} teachers`}
        value={staff}
        tone="violet"
        icon={Users}
        footer={{ leftLabel: "Male", left: staffMale, rightLabel: "Female", right: staffFemale }}
      />
    </div>
  );
}