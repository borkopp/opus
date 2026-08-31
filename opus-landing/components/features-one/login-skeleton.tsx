"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-full w-full mask-b-from-50% p-4 md:p-6", className)}>
      <div className="h-[500px] w-full rounded-xl bg-card border border-border shadow-sm flex flex-col overflow-hidden">

        {/* Header toolbar */}
        {/* <div className="flex items-center justify-between border-b border-border px-3 py-2.5 bg-background/50 dark:bg-secondary/20">
          <div className="h-3 w-28 rounded-sm bg-muted dark:bg-muted-foreground/50 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-4 w-4 rounded-sm bg-muted dark:bg-muted-foreground/50 animate-pulse" />
            <div className="h-4 w-12 rounded-sm bg-muted dark:bg-muted-foreground/50 animate-pulse" />
          </div>
        </div> */}

        {/* Staff Headers */}
        <div className="flex items-center border-b border-border bg-card">
          <div className="w-12 shrink-0 border-r border-border h-8" />
          <div className="flex-1 flex justify-center py-2 border-r border-border">
            <div className="flex items-center gap-1.5 grayscale opacity-80">
              <img src="https://assets.aceternity.com/avatars/1.webp" className="size-4 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-foreground/5 dark:ring-primary-foreground/10" alt="Марко" />
              <span className="text-[10px] font-medium text-muted-foreground">Марко</span>
            </div>
          </div>
          <div className="flex-1 flex justify-center py-2">
            <div className="flex items-center gap-1.5 grayscale opacity-80">
              <img src="https://assets.aceternity.com/avatars/2.webp" className="size-4 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-foreground/5 dark:ring-primary-foreground/10" alt="Ана" />
              <span className="text-[10px] font-medium text-muted-foreground">Ана</span>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-hidden flex relative bg-muted/20">

          {/* Time sidebar */}
          <div className="w-12 shrink-0 border-r border-border flex flex-col pt-2 bg-card">
            {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time, i) => (
              <div key={i} className="h-[48px] flex justify-center">
                <span className="text-[9px] text-muted-foreground font-medium -mt-1.5">{time}</span>
              </div>
            ))}
          </div>

          {/* Grid lines and Bookings */}
          <div className="flex-1 relative">
            {/* Horizontal guidelines */}
            <div className="absolute inset-0 flex flex-col">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[48px] border-b border-border/60 w-full" />
              ))}
            </div>

            {/* Vertical column divider */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />

            {/* Current time indicator line */}
            <div className="absolute top-[80px] left-0 right-0 z-20 flex items-center">
              <div className="absolute -left-1.5 size-1.5 rounded-full bg-primary" />
              <div className="h-[1.5px] w-full bg-primary opacity-80" />
            </div>

            {/* Bookings */}
            {/* Marko's column: offset 0 to 50% */}

            {/* Completed booking */}
            <div className="absolute top-[12px] left-[3%] w-[44%] h-[56px] rounded-md bg-muted/50 border border-border p-1.5 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-foreground">Потстрижување</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">Петар • 10:00</p>
            </div>

            {/* Upcoming booking - currently active */}
            <div className="absolute top-[75px] left-[3%] w-[44%] h-[68px] rounded-md border border-primary/40 bg-primary/10 dark:bg-primary/20 p-2 z-10 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-primary">Фејд + Брада</p>
              <p className="text-[8px] font-medium text-primary/80 mt-1">Иван • 11:30</p>
            </div>

            {/* Later booking */}
            <div className="absolute top-[180px] left-[3%] w-[44%] h-[48px] rounded-md border border-primary/30 bg-primary/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-primary">Шишање деца</p>
              <p className="text-[8px] font-medium text-primary/80 mt-1">Матеј • 12:45</p>
            </div>

            {/* Evening booking */}
            <div className="absolute top-[260px] left-[3%] w-[44%] h-[80px] rounded-md bg-muted/50 border border-border p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-foreground">Седење</p>
              <p className="text-[8px] text-muted-foreground mt-1">Никола • Целосен третман</p>
            </div>

            {/* Ana's column: offset 50% to 100% */}

            {/* Highlighted booking */}
            <div className="absolute top-[36px] left-[53%] w-[44%] h-[84px] rounded-md border border-highlight/40 bg-highlight/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-warning">Фарбање</p>
              <p className="text-[8px] font-medium text-warning/80 mt-1">Елена • 14:00</p>
            </div>

            {/* Future booking */}
            <div className="absolute top-[136px] left-[53%] w-[44%] h-[60px] rounded-md border border-primary/30 bg-primary/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-primary">Шминка</p>
              <p className="text-[8px] font-medium text-primary/80 mt-1">Сара • 15:30</p>
            </div>

            {/* Completed booking */}
            <div className="absolute top-[230px] left-[53%] w-[44%] h-[90px] rounded-md border border-success/30 bg-success/10 p-2 z-10 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-success">Маникир + Педикир</p>
              <p className="text-[8px] font-medium text-success/80 mt-1">Јована • Завршено</p>
            </div>

            {/* Very late booking */}
            <div className="absolute top-[340px] left-[53%] w-[44%] h-[60px] rounded-md border border-highlight/30 bg-highlight/10 p-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
              <p className="text-[9px] font-semibold text-warning">Стил на коса</p>
              <p className="text-[8px] font-medium text-warning/80 mt-1">Кристина</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
