"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IconSparkles, IconTrendingUp, IconSend } from "@tabler/icons-react";

export function GapOptimizerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center p-4", className)}>
      <div className="relative h-[340px] w-full max-w-[450px] rounded-xl border border-border bg-card shadow-lg">

        {/* Calendar Header Simulation */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">AI Оптимизатор Активен</span>
          </div>
          <div className="flex gap-1">
            <div className="h-4 w-12 rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        {/* Schedule View */}
        <div className="relative p-4">
          <div className="space-y-4">
            {/* Booking 1 */}
            <div className="relative flex items-start gap-3">
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] text-muted-foreground font-mono">10:00</span>
              </div>
              <div className="h-10 flex-1 rounded-lg border border-border bg-muted/50 p-2 opacity-60">
                <div className="h-2 w-20 rounded bg-muted" />
              </div>
            </div>

            {/* THE GAP */}
            <div className="relative flex items-start gap-3">
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] text-muted-foreground font-mono">11:00</span>
              </div>
              <div className="relative flex-1 group">
                {/* Visual "Hole" in schedule */}
                  <div className="h-24 w-full rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                  {/* Scanning animation */}
                  <motion.div
                    initial={{ top: -20 }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-4 bg-gradient-to-b from-primary/20 to-transparent z-10"
                  />

                  <div className="flex flex-col items-center gap-1 z-20">
                    <IconSparkles className="size-5 text-primary animate-bounce" />
                    <span className="text-[10px] font-bold text-primary">Пронајдена дупка: 60 мин</span>
                  </div>
                </div>

                {/* AI Result Cards */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute right-0 top-6 z-30 flex translate-x-1/2 flex-col gap-2 scale-90 md:scale-100"
                >
                  {/* Revenue Card */}
                  <div className="rounded-lg bg-success p-2 text-primary-foreground shadow-lg flex items-center gap-2 w-40">
                    <IconTrendingUp className="size-3" />
                    <span className="text-[9px] font-bold">+1,200 ден.</span>
                  </div>

                  {/* Candidate Card */}
                  <div className="rounded-lg bg-card border border-border p-2 shadow-lg w-40">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <img src="https://assets.aceternity.com/avatars/3.webp" className="size-4 object-cover rounded-full" alt="" />
                      <span className="text-[9px] font-bold">Ана К.</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full mb-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 1, delay: 1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground">Идеален кандидат</span>
                  </div>

                  {/* Message Bubble */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 1.5 }}
                    className="rounded-lg rounded-tr-none bg-primary p-2 text-primary-foreground shadow-lg w-40"
                  >
                    <p className="text-[8px] italic leading-tight">&quot;Здраво Ана! Имаме слободен термин во 11:00 кај Марко. Сакаш ли да го резервираш?&quot;</p>
                    <div className="flex justify-end mt-1">
                      <IconSend className="size-3 opacity-80" />
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Booking 2 */}
            <div className="relative flex items-start gap-3">
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] text-muted-foreground font-mono">12:30</span>
              </div>
              <div className="h-16 flex-1 rounded-lg border border-border bg-muted/50 p-2 opacity-60">
                <div className="h-2 w-28 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-muted/40 px-4 py-2 flex justify-between items-center rounded-b-xl">
          <span className="text-[9px] font-medium text-success">Скенирањето е завршено</span>

        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute -z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
    </div>
  );
}
