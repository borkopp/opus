"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IconSparkles, IconTrendingUp, IconUser, IconMessageChatbot, IconChartLine } from "@tabler/icons-react";
import { useI18n } from "../i18n-provider";

export function AnalysisUpsellSkeleton({ className }: { className?: string }) {
   const { messages } = useI18n();
   const copy = messages.demos.analysis;

   return (
      <div className={cn("relative flex h-full w-full items-center justify-center p-4", className)}>
         <div className="relative w-full max-w-[400px] flex flex-col gap-3">

            {/* Main Customer Card */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 transition-all">
               <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                     <IconUser className="size-5 text-neutral-400" />
                  </div>
                  <div className="flex-1">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{copy.customer}</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{copy.lifetimeValue}</span>
                     </div>
                     <span className="text-xs text-neutral-500">{copy.appointment}</span>
                  </div>
               </div>

               <div className="space-y-3">
                  {/* AI Intelligence Header */}
                  <div className="flex items-center gap-2 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                     <IconSparkles className="size-3 text-brand-primary" />
                     <span>{copy.heading}</span>
                  </div>

                  {/* Suggestion 1: Context */}
                  <motion.div
                     initial={{ x: -10, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.2 }}
                     className="rounded-xl border border-brand-primary/10 bg-brand-primary/5 p-3 flex items-start gap-3"
                  >
                     <div className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                        <IconMessageChatbot className="size-4" />
                     </div>
                     <div>
                        <p className="text-[11px] font-bold text-brand-primary mb-0.5">{copy.noteTitle}</p>
                        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                           {copy.note}
                        </p>
                     </div>
                  </motion.div>

                  {/* Suggestion 2: Upsell */}
                  <motion.div
                     initial={{ x: 10, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.4 }}
                     className="rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-500/10 dark:bg-blue-500/5 p-3 flex items-start gap-3"
                  >
                     <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <IconTrendingUp className="size-4" />
                     </div>
                     <div>
                        <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-0.5">{copy.upsellTitle}</p>
                        <p className="text-[10px] text-blue-700/80 dark:text-blue-300/60 leading-relaxed font-semibold">
                           {copy.upsell}
                        </p>
                     </div>
                  </motion.div>
               </div>
            </div>

            {/* Small Data Card (floating) */}
            <motion.div
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.6 }}
               className="self-end -mt-10 -mr-2 rounded-xl border border-neutral-200 bg-white p-2 px-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 flex items-center gap-2 w-46 z-10"
            >
               <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                  <IconChartLine className="size-4" />
               </div>
               <div>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-tight">{copy.likelihood}</p>
                  <span className="text-xs font-black text-emerald-600 uppercase">93%</span>
               </div>
            </motion.div>

         </div>

         {/* Background Glow */}
         <div className="absolute -z-10 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl translate-x-1/2" />
      </div>
   );
}
