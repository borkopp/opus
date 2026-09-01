"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IconSparkles, IconTrendingUp, IconSend } from "@tabler/icons-react";
import { useI18n } from "../i18n-provider";

export function GapOptimizerSkeleton({ className }: { className?: string }) {
  const { messages } = useI18n();
  const copy = messages.demos.gap;

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center p-4", className)}>
      <div className="relative h-[340px] w-full max-w-[450px] rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">

        {/* Calendar Header Simulation */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider">{copy.active}</span>
          </div>
          <div className="flex gap-1">
            <div className="h-4 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          </div>
        </div>

        {/* Schedule View */}
        <div className="relative p-4">
          <div className="space-y-4">
            {/* Booking 1 */}
            <div className="relative flex items-start gap-3">
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] text-neutral-400 font-mono">10:00</span>
              </div>
              <div className="h-10 flex-1 rounded-lg border border-neutral-200 bg-neutral-100/50 p-2 dark:border-neutral-800 dark:bg-neutral-800/50 opacity-60">
                <div className="h-2 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            </div>

            {/* THE GAP */}
            <div className="relative flex items-start gap-3">
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] text-neutral-400 font-mono">11:00</span>
              </div>
              <div className="relative flex-1 group">
                {/* Visual "Hole" in schedule */}
                <div className="h-24 w-full rounded-lg border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                  {/* Scanning animation */}
                  <motion.div
                    initial={{ top: -20 }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-4 bg-gradient-to-b from-brand-primary/20 to-transparent z-10"
                  />

                  <div className="flex flex-col items-center gap-1 z-20">
                    <IconSparkles className="size-5 text-brand-primary animate-bounce" />
                    <span className="text-[10px] font-bold text-brand-primary">{copy.found}</span>
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
                  <div className="rounded-lg bg-emerald-500 p-2 text-white shadow-lg flex items-center gap-2 w-40">
                    <IconTrendingUp className="size-3" />
                    <span className="text-[9px] font-bold">{copy.revenue}</span>
                  </div>

                  {/* Candidate Card */}
                  <div className="rounded-lg bg-white border border-neutral-200 p-2 shadow-lg dark:bg-neutral-800 dark:border-neutral-700 w-40">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <img src="https://assets.aceternity.com/avatars/3.webp" className="size-4 object-cover rounded-full" alt="" />
                      <span className="text-[9px] font-bold">{copy.candidate}</span>
                    </div>
                    <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full mb-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 1, delay: 1 }}
                        className="h-full bg-brand-primary rounded-full"
                      />
                    </div>
                    <span className="text-[8px] text-neutral-500">{copy.idealCandidate}</span>
                  </div>

                  {/* Message Bubble */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 1.5 }}
                    className="rounded-xl rounded-tr-none bg-brand-primary p-2 text-white shadow-lg w-40"
                  >
                    <p className="text-[8px] italic leading-tight">{copy.message}</p>
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
                <span className="text-[10px] text-neutral-400 font-mono">12:30</span>
              </div>
              <div className="h-16 flex-1 rounded-lg border border-neutral-200 bg-neutral-100/50 p-2 dark:border-neutral-800 dark:bg-neutral-800/50 opacity-60">
                <div className="h-2 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-100 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800 flex justify-between items-center rounded-b-2xl">
          <span className="text-[9px] font-medium text-emerald-600">{copy.complete}</span>

        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute -z-10 h-64 w-64 rounded-full bg-brand-primary/5 blur-3xl" />
    </div>
  );
}
