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

export function IPhoneSkeleton() {
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
      <div className="relative mx-auto w-24">
        <div className="absolute top-10 -left-[2px] flex flex-col gap-1.5">
          <div className="h-2.5 w-[2px] rounded-l-sm bg-neutral-300 dark:bg-neutral-600" />
          <div className="h-4 w-[2px] rounded-l-sm bg-neutral-300 dark:bg-neutral-600" />
          <div className="h-4 w-[2px] rounded-l-sm bg-neutral-300 dark:bg-neutral-600" />
        </div>
        <div className="absolute top-14 -right-[2px]">
          <div className="h-6 w-[2px] rounded-r-sm bg-neutral-300 dark:bg-neutral-600" />
        </div>

        <div className="rounded-[1.25rem] bg-neutral-200 p-1 shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-700 dark:shadow-white/5 dark:ring-white/10">
          <div className="relative h-40 w-full overflow-hidden rounded-[1rem] bg-white dark:bg-neutral-900">
            <motion.div
              variants={screenContentVariants}
              transition={CONTENT_TRANSITION}
              className="absolute inset-0"
            >
              <Image
                src="https://assets.aceternity.com/components/flipping-images-with-bar.webp"
                alt="Screen"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-x-0 top-0 z-10">
                <IPhoneDynamicIsland ref={dynamicIslandRef} />
              </div>
            </motion.div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-1.5 mx-auto h-0.5 w-8 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      </div>
    </motion.div>
  );
}

function IPhoneDynamicIsland({ ref }: { ref: React.Ref<DynamicIslandHandle> }) {
  const [scope, animate] = useAnimate();
  const hasAnimatedRef = useRef(false);

  const reset = () => {
    hasAnimatedRef.current = false;
    animate(
      scope.current,
      { width: 28, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    animate("#iphone-idle", { opacity: 1 }, { duration: 0.15 });
    animate("#iphone-loading", { opacity: 0 }, { duration: 0.1 });
    animate("#iphone-done", { opacity: 0 }, { duration: 0.1 });
  };

  const start = async () => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    await animate("#iphone-idle", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 16, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate("#iphone-loading", { opacity: 1 }, { duration: 0.15 });
    await new Promise((r) => setTimeout(r, 1000));
    await animate("#iphone-loading", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 40, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate(
      "#iphone-done",
      { opacity: 1 },
      { duration: 0.15, delay: 0.1 },
    );
  };

  useImperativeHandle(ref, () => ({ start, reset }));

  return (
    <div className="flex w-full items-start justify-center pt-1.5">
      <div
        ref={scope}
        className="relative overflow-hidden bg-black"
        style={{ width: 28, height: 10, borderRadius: 5 }}
      >
        <div
          id="iphone-idle"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 1 }}
        >
          <div className="flex items-center gap-0.5">
            <div className="h-1 w-1 rounded-full bg-neutral-700" />
            <div className="h-0.5 w-0.5 rounded-full bg-neutral-600" />
          </div>
        </div>
        <div
          id="iphone-loading"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <MiniLoadingDots />
        </div>
        <div
          id="iphone-done"
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
