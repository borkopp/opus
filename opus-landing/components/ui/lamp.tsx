"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function LampContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const beamInitial = shouldReduceMotion
    ? { opacity: 1, scaleX: 1 }
    : { opacity: 0.5, scaleX: 0.5 };
  const coreInitial = shouldReduceMotion
    ? { width: "16rem" }
    : { width: "8rem" };
  const lineInitial = shouldReduceMotion
    ? { width: "30rem" }
    : { width: "15rem" };

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden bg-white dark:bg-neutral-950",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none relative isolate flex h-96 w-full scale-y-125 items-center justify-center md:h-[28rem]"
      >
        <motion.div
          initial={beamInitial}
          whileInView={{ opacity: 1, scaleX: 1 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          viewport={{ once: true }}
          style={{
            backgroundImage:
              "conic-gradient(from 70deg at 100% 0%, var(--color-brand-primary) 0deg, rgba(206,93,69,0.35) 20deg, transparent 50deg, transparent 360deg)",
          }}
          className="absolute right-1/2 h-56 w-[min(30rem,100vw)] origin-top-right overflow-visible"
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full bg-white [mask-image:linear-gradient(to_top,white,transparent)] dark:bg-neutral-950" />
          <div className="absolute bottom-0 left-0 z-20 h-full w-40 bg-white [mask-image:linear-gradient(to_right,white,transparent)] dark:bg-neutral-950" />
        </motion.div>

        <motion.div
          initial={beamInitial}
          whileInView={{ opacity: 1, scaleX: 1 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          viewport={{ once: true }}
          style={{
            backgroundImage:
              "conic-gradient(from 290deg at 0% 0%, transparent 0deg, transparent 310deg, rgba(206,93,69,0.35) 340deg, var(--color-brand-primary) 360deg)",
          }}
          className="absolute left-1/2 h-56 w-[min(30rem,100vw)] origin-top-left"
        >
          <div className="absolute right-0 bottom-0 z-20 h-full w-40 bg-white [mask-image:linear-gradient(to_left,white,transparent)] dark:bg-neutral-950" />
          <div className="absolute right-0 bottom-0 z-20 h-40 w-full bg-white [mask-image:linear-gradient(to_top,white,transparent)] dark:bg-neutral-950" />
        </motion.div>

        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-white blur-2xl dark:bg-neutral-950" />
        <div className="absolute top-1/2 z-30 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="bg-brand-primary/50 absolute z-40 h-36 w-[min(28rem,82vw)] -translate-y-1/2 rounded-full blur-3xl" />

        <motion.div
          initial={coreInitial}
          whileInView={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          viewport={{ once: true }}
          className="bg-brand-secondary absolute z-30 h-36 w-64 -translate-y-24 rounded-full blur-2xl"
        />

        <motion.div
          initial={lineInitial}
          whileInView={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          viewport={{ once: true }}
          className="bg-brand-secondary absolute z-50 h-0.5 w-[30rem] max-w-[84vw] -translate-y-28 shadow-[0_0_20px_rgba(228,138,119,0.9)]"
        />

        <div className="absolute z-40 h-44 w-full -translate-y-[12.5rem] bg-white dark:bg-neutral-950" />
      </div>

      <div className="relative z-50 -mt-52 flex w-full flex-col items-center px-5 pb-12 md:-mt-56 md:pb-16">
        {children}
      </div>
    </div>
  );
}
