"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "../i18n-provider";

export function CalendarSkeleton({ className }: { className?: string }) {
  const { messages } = useI18n();
  const copy = messages.demos.calendar;

  return (
    <div className={cn("h-full w-full mask-b-from-50% p-4 md:p-6", className)}>
      <div className="h-[500px] w-full rounded-xl bg-white border border-neutral-200 shadow-sm dark:bg-neutral-900/50 dark:border-neutral-800 flex flex-col overflow-hidden">

        {/* Header toolbar */}
        {/* <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-3 py-2.5 bg-neutral-50/50 dark:bg-neutral-800/20">
          <div className="h-3 w-28 rounded-sm bg-neutral-200 dark:bg-neutral-700/50 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-4 w-4 rounded-sm bg-neutral-200 dark:bg-neutral-700/50 animate-pulse" />
            <div className="h-4 w-12 rounded-sm bg-neutral-200 dark:bg-neutral-700/50 animate-pulse" />
          </div>
        </div> */}

        {/* Staff Headers */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="w-12 shrink-0 border-r border-neutral-200 dark:border-neutral-800 h-8" />
          <div className="flex-1 flex justify-center py-2 border-r border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 grayscale opacity-80">
              <img src="https://assets.aceternity.com/avatars/1.webp" className="size-4 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10" alt={copy.staff[0]} />
              <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">{copy.staff[0]}</span>
            </div>
          </div>
          <div className="flex-1 flex justify-center py-2">
            <div className="flex items-center gap-1.5 grayscale opacity-80">
              <img src="https://assets.aceternity.com/avatars/2.webp" className="size-4 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10" alt={copy.staff[1]} />
              <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">{copy.staff[1]}</span>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-hidden flex relative bg-neutral-50/30 dark:bg-neutral-900/20">

          {/* Time sidebar */}
          <div className="w-12 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col pt-2 bg-white dark:bg-neutral-900">
            {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time, i) => (
              <div key={i} className="h-[48px] flex justify-center">
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium -mt-1.5">{time}</span>
              </div>
            ))}
          </div>

          {/* Grid lines and Bookings */}
          <div className="flex-1 relative">
            {/* Horizontal guidelines */}
            <div className="absolute inset-0 flex flex-col">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[48px] border-b border-neutral-200/60 dark:border-neutral-800/50 w-full" />
              ))}
            </div>

            {/* Vertical column divider */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-200/60 dark:bg-neutral-800/50" />

            {/* Current time indicator line */}
            <div className="absolute top-[80px] left-0 right-0 z-20 flex items-center">
              <div className="absolute -left-1.5 size-1.5 rounded-full bg-brand-primary" />
              <div className="h-[1.5px] w-full bg-brand-primary opacity-80 shadow-[0_0_8px_rgba(206,93,69,0.5)]" />
            </div>

            {/* Bookings */}
            {/* Marko's column: offset 0 to 50% */}

            {/* Completed booking */}
            <div className="absolute top-[12px] left-[3%] w-[44%] h-[56px] rounded-md bg-neutral-200/40 border border-neutral-300 dark:bg-neutral-800/70 dark:border-neutral-700/70 p-1.5 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-neutral-600 dark:text-neutral-300">{copy.bookings[0].title}</p>
              <p className="text-[8px] text-neutral-500 dark:text-neutral-400 mt-0.5">{copy.bookings[0].details}</p>
            </div>

            {/* Upcoming booking - currently active */}
            <div className="absolute top-[75px] left-[3%] w-[44%] h-[68px] rounded-md border border-brand-primary/40 bg-brand-primary/10 dark:bg-brand-primary/20 p-2 z-10 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-brand-primary dark:text-white">{copy.bookings[1].title}</p>
              <p className="text-[8px] font-medium text-brand-primary/80 dark:text-neutral-300 mt-1">{copy.bookings[1].details}</p>
            </div>

            {/* Later booking */}
            <div className="absolute top-[180px] left-[3%] w-[44%] h-[48px] rounded-md border border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-blue-700 dark:text-blue-400">{copy.bookings[2].title}</p>
              <p className="text-[8px] font-medium text-blue-600/80 dark:text-blue-400/80 mt-1">{copy.bookings[2].details}</p>
            </div>

            {/* Evening booking */}
            <div className="absolute top-[260px] left-[3%] w-[44%] h-[80px] rounded-md bg-neutral-200/40 border border-neutral-300 dark:bg-neutral-800/70 dark:border-neutral-700/70 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-neutral-600 dark:text-neutral-300">{copy.bookings[3].title}</p>
              <p className="text-[8px] text-neutral-500 dark:text-neutral-400 mt-1">{copy.bookings[3].details}</p>
            </div>

            {/* Ana's column: offset 50% to 100% */}

            {/* Unpaid / Deposit booking */}
            <div className="absolute top-[36px] left-[53%] w-[44%] h-[84px] rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-500">{copy.bookings[4].title}</p>
              <p className="text-[8px] font-medium text-amber-600/80 dark:text-amber-500/80 mt-1">{copy.bookings[4].details}</p>
            </div>

            {/* Future booking */}
            <div className="absolute top-[136px] left-[53%] w-[44%] h-[60px] rounded-md border border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-blue-700 dark:text-blue-400">{copy.bookings[5].title}</p>
              <p className="text-[8px] font-medium text-blue-600/80 dark:text-blue-400/80 mt-1">{copy.bookings[5].details}</p>
            </div>

            {/* Completed/Paid booking */}
            <div className="absolute top-[230px] left-[53%] w-[44%] h-[90px] rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-2 z-10 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-500">{copy.bookings[6].title}</p>
              <p className="text-[8px] font-medium text-emerald-600/80 dark:text-emerald-500/80 mt-1">{copy.bookings[6].details}</p>
            </div>

            {/* Very late booking */}
            <div className="absolute top-[340px] left-[53%] w-[44%] h-[60px] rounded-md border border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-purple-700 dark:text-purple-400">{copy.bookings[7].title}</p>
              <p className="text-[8px] font-medium text-purple-600/80 dark:text-purple-400/80 mt-1">{copy.bookings[7].details}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
