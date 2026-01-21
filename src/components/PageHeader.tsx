"use client";

import { ReactNode } from "react";
import { Plus, Zap } from "lucide-react";

interface PageHeaderProps {
  title: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  icon?: ReactNode;
}

export default function PageHeader({
  title,
  buttonLabel,
  onButtonClick,
  icon,
}: PageHeaderProps) {
  return (
    /* top-0 ensures it sticks exactly below Topbar. 
       pt-4 provides the gap from top that doesn't disappear on scroll. */
    <div className="sticky top-0 z-30 w-full bg-[#F8FAFC]">
      <div className="group relative p-[2px] overflow-hidden rounded-xl bg-transparent shadow-2xl">
        {/* 1. Slow Rotating 4-Sided Border Beam */}
        <div className="absolute inset-[-1000%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_30%,#3b82f6_50%,transparent_70%,transparent_100%)] opacity-100"></div>

        {/* 2. Content Container */}
        <div className="relative flex items-center justify-between gap-2 rounded-[10px] bg-slate-950 px-3 py-2">
          {/* Left Side: Icon & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-7 h-7 rounded bg-blue-600/20 text-blue-400 group-hover:scale-110 group-hover:rotate-[360deg] transition-all duration-700 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              {icon || <Zap className="w-4 h-4" />}
              <span className="absolute inset-0 rounded bg-blue-400 animate-ping opacity-100"></span>
            </div>

            <h1 className="text-[11px] font-semibold text-slate-100 uppercase tracking-[0.25em] sm:text-sm group-hover:translate-x-1 transition-transform duration-300">
              {title}
            </h1>
          </div>

          {/* Right Side: Action Button */}
          {buttonLabel && (
            <button
              onClick={onButtonClick}
              className="group/btn relative flex h-8 items-center justify-center overflow-hidden rounded-lg bg-blue-600 px-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-90 cursor-pointer"
            >
              {/* Button Shimmer */}
              <span className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></span>

              <div className="relative flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                <span className="hidden sm:inline">{buttonLabel}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
