"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Lock, Sparkles, Clock, ArrowRight, Check } from "lucide-react";
import { useI18n } from "../i18n-provider";
import { landingCopy } from "@/lib/landing-copy";

export function WebsiteBookingSkeleton({ className }: { className?: string }) {
  const { locale, messages } = useI18n();
  const copy = messages.demos.website;

  return (
    <div
      className={cn(
        "relative flex aspect-[16/11] w-full flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 shadow-xs sm:p-4 dark:border-neutral-800 dark:bg-neutral-900/50",
        className,
      )}
    >
      {/* Subtle Grid Pattern Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Browser Bar / Address Pill */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-xs ring-1 ring-black/5 backdrop-blur-xs dark:bg-neutral-950/80 dark:ring-white/10"
      >
        {/* macOS Window Controls */}
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400/80" />
          <span className="size-2 rounded-full bg-amber-400/80" />
          <span className="size-2 rounded-full bg-emerald-400/80" />
        </div>

        {/* URL Pill */}
        <div className="flex items-center gap-1.5 rounded-md bg-neutral-100/80 px-2.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          <Lock className="text-brand-primary size-2.5 shrink-0" />
          <span className="truncate">
            <span className="font-semibold text-neutral-900 dark:text-white">
              elena-beauty
            </span>
            .opus.mk
          </span>
        </div>

        <div className="w-8" />
      </motion.div>

      {/* Mini Studio Website Preview */}
      <div className="relative z-10 mt-2 flex flex-col gap-2">
        {/* Studio Header Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-xs ring-1 ring-black/5 dark:bg-neutral-900/90 dark:ring-white/10"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="from-brand-primary relative size-8 shrink-0 rounded-lg bg-gradient-to-tr to-orange-400 p-0.5 shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&auto=format&fit=crop&q=80"
                alt="Elena Beauty"
                className="size-full rounded-[6px] object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                  Elena Beauty Studio
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                <span>{landingCopy[locale].demoLabel}</span>
                <span>•</span>
                <span className="truncate">{copy.location}</span>
              </div>
            </div>
          </div>

          <div className="bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold">
            {copy.open}
          </div>
        </motion.div>

        {/* Selected Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="border-brand-primary/40 bg-brand-primary/5 dark:bg-brand-primary/10 flex items-center justify-between rounded-xl border p-2 px-2.5 shadow-xs"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="bg-brand-primary flex size-5 shrink-0 items-center justify-center rounded-full text-white">
              <Check className="size-3 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white">
                {copy.service}
              </p>
              <div className="flex items-center gap-1 text-[9px] text-neutral-500 dark:text-neutral-400">
                <Clock className="size-2.5" />
                <span>{copy.duration}</span>
              </div>
            </div>
          </div>
          <span className="text-brand-primary text-xs font-bold">
            {copy.price}
          </span>
        </motion.div>

        {/* Slot Selection & Action Row */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="bg-brand-primary rounded-lg px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs">
              {copy.tomorrow}
            </span>
            <span className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[10px] font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              15:30
            </span>
            <span className="hidden rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[10px] font-medium text-neutral-600 sm:inline-block dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              16:30
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs dark:bg-white dark:text-neutral-900">
            <span>{copy.book}</span>
            <ArrowRight className="size-2.5" />
          </div>
        </motion.div>
      </div>

      {/* Floating Customer Notification Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="absolute right-3 bottom-2.5 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/95 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm dark:border-neutral-200 dark:bg-white dark:text-neutral-900"
      >
        <div className="bg-brand-primary flex size-5 shrink-0 items-center justify-center rounded-full text-white">
          <Sparkles className="size-2.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-brand-primary text-[8px] font-bold tracking-wider uppercase">
            {copy.newBooking}
          </span>
          <span className="text-[10px] font-semibold">
            {copy.bookingDetails}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// Keep FloorPlanSkeleton alias for backwards compatibility
export const FloorPlanSkeleton = WebsiteBookingSkeleton;
