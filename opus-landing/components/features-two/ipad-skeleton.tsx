"use client";
import React, { useRef, useImperativeHandle } from "react";
import { Easing, motion, useAnimate } from "motion/react";
import Image from "next/image";

interface DynamicIslandHandle {
  start: () => void;
  reset: () => void;
}

const SPRING_OPTIONS = {
  type: "spring" as const,
  stiffness: 500,
  damping: 40,
};

export function IPadSkeleton() {
  const dynamicIslandRef = useRef<DynamicIslandHandle>(null);

  const screenContentVariants = {
    initial: { opacity: 0, filter: "blur(8px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
  };

  const CONTENT_TRANSITION = {
    duration: 0.3,
    ease: "easeOut" as Easing,
    delay: 0.2,
  };

  return (
    <motion.div
      onHoverStart={() => dynamicIslandRef.current?.start()}
      onHoverEnd={() => dynamicIslandRef.current?.reset()}
    >
      <div className="relative mx-auto w-56">
        <div className="absolute top-6 -right-[2px] flex flex-col gap-1.5">
          <div className="h-5 w-[2px] rounded-r-sm bg-neutral-300 dark:bg-neutral-600" />
          <div className="h-5 w-[2px] rounded-r-sm bg-neutral-300 dark:bg-neutral-600" />
        </div>
        <div className="absolute -top-[2px] right-10">
          <div className="h-[2px] w-6 rounded-t-sm bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <div className="rounded-[1rem] bg-neutral-200 p-1 shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-700 dark:shadow-white/5 dark:ring-white/10">
          <div className="relative h-36 w-full overflow-hidden rounded-[0.75rem] bg-white dark:bg-neutral-900">
            <motion.div
              variants={screenContentVariants}
              transition={CONTENT_TRANSITION}
              className="absolute inset-0"
            >
              <Image
                src="https://assets.aceternity.com/components/flipping-images-with-bar.webp"
                alt="Screen"
                fill
                className="object-cover"
              />
              <div className="absolute inset-x-0 top-0 z-10">
                <IPadDynamicIsland ref={dynamicIslandRef} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function IPadDynamicIsland({ ref }: { ref: React.Ref<DynamicIslandHandle> }) {
  const [scope, animate] = useAnimate();
  const hasAnimatedRef = useRef(false);

  const reset = () => {
    hasAnimatedRef.current = false;
    animate(
      scope.current,
      { width: 32, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    animate("#ipad-idle", { opacity: 1 }, { duration: 0.15 });
    animate("#ipad-loading", { opacity: 0 }, { duration: 0.1 });
    animate("#ipad-done", { opacity: 0 }, { duration: 0.1 });
  };

  const start = async () => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    await animate("#ipad-idle", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 18, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate("#ipad-loading", { opacity: 1 }, { duration: 0.15 });
    await new Promise((r) => setTimeout(r, 1000));
    await animate("#ipad-loading", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 44, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate("#ipad-done", { opacity: 1 }, { duration: 0.15, delay: 0.1 });
  };

  useImperativeHandle(ref, () => ({ start, reset }));

  return (
    <div className="flex w-full items-start justify-center pt-1.5">
      <div
        ref={scope}
        className="relative overflow-hidden bg-black"
        style={{ width: 32, height: 10, borderRadius: 5 }}
      >
        <div
          id="ipad-idle"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 1 }}
        >
          <div className="flex items-center gap-0.5">
            <div className="h-1 w-1 rounded-full bg-neutral-700" />
            <div className="h-0.5 w-0.5 rounded-full bg-neutral-600" />
          </div>
        </div>
        <div
          id="ipad-loading"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <MiniLoadingDots />
        </div>
        <div
          id="ipad-done"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <span className="text-[3px] leading-none font-medium text-white">
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniLoadingDots() {
  return (
    <div className="flex items-center gap-px">
      <MiniLoadingDot delay={0} />
      <MiniLoadingDot delay={0.1} />
      <MiniLoadingDot delay={0.2} />
    </div>
  );
}

function MiniLoadingDot({ delay }: { delay: number }) {
  return (
    <motion.div
      className="h-0.5 w-0.5 rounded-full bg-white"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}
