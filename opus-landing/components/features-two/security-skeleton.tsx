"use client";
import React from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Scales from "../ui/scales";

export function SecuritySkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-20 items-center justify-center p-2",
        className,
      )}
    >
      <Scales size={8} className="rounded-lg" />
      <div className="flex items-center gap-0">
        {/* Left Avatar - Blurred */}
        <div className="relative z-10 shrink-0">
          <div className="size-7 overflow-hidden rounded-full ring-2 ring-white/50 dark:ring-neutral-800/50">
            <Image
              width={48}
              height={48}
              src="https://assets.aceternity.com/avatars/1.webp"
              alt="User avatar"
              className="size-full object-cover blur-[2px]"
            />
          </div>
        </div>

        {/* Beam Section */}
        <div className="relative flex items-center">
          {/* Left Beams - 2 lines stacked */}
          <div className="flex w-6 flex-col gap-2 md:w-14">
            <SecurityBeam delay={0} />
            <SecurityBeam delay={0.4} />
            <SecurityBeam delay={0.8} />
          </div>

          {/* Lock Icon Container */}
          <div className="relative z-10 shrink-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <Lock className="size-4 text-neutral-600" />
            </div>
          </div>

          {/* Right Beams - 2 lines stacked */}
          <div className="flex w-6 flex-col gap-2 md:w-14">
            <SecurityBeam delay={0.8} />
          </div>
        </div>

        {/* Right Avatar - Unblurred */}
        <div className="relative z-10 shrink-0">
          <div className="size-6 overflow-hidden rounded-full ring-2 ring-white/50 dark:ring-neutral-800/50">
            <Image
              width={48}
              height={48}
              src="https://assets.aceternity.com/avatars/2.webp"
              alt="User avatar"
              className="size-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityBeam({ delay = 0 }: { delay?: number }) {
  return (
    <div className="relative h-px w-full overflow-hidden">
      {/* Dotted line background */}
      <div className="absolute inset-0 border-t border-dotted border-neutral-300 dark:border-neutral-600" />
      {/* Animated dotted pulse with fade */}
      <motion.div
        className="absolute top-0 h-px w-10"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-brand-primary) 20%, var(--color-brand-primary) 80%, transparent)",
          maskImage:
            "repeating-linear-gradient(to right, black 0px, black 2px, transparent 2px, transparent 5px)",
          WebkitMaskImage:
            "repeating-linear-gradient(to right, black 0px, black 2px, transparent 2px, transparent 5px)",
        }}
        initial={{ x: "-100%", opacity: 0 }}
        animate={{
          x: ["0%", "400%"],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.5,
          delay: delay,
          repeat: Infinity,
          repeatDelay: 1,
          ease: "linear",
        }}
      />
    </div>
  );
}
