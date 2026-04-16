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

export function MacbookSkeleton() {
  const dynamicIslandRef = useRef<DynamicIslandHandle>(null);

  const lidVariants = {
    initial: { rotateX: -60 },
    animate: { rotateX: 20 },
  };

  const screenContentVariants = {
    initial: { opacity: 0, filter: "blur(8px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
  };

  const TRANSITION = {
    duration: 0.98,
    ease: [0.901, 0.016, 0, 1.032] as Easing,
  };

  const CONTENT_TRANSITION = {
    duration: 0.3,
    ease: "easeOut" as Easing,
    delay: 0.5,
  };

  return (
    <motion.div
      onHoverStart={() => dynamicIslandRef.current?.start()}
      onHoverEnd={() => dynamicIslandRef.current?.reset()}
    >
      <div className="mx-auto w-80 perspective-distant">
        <motion.div
          style={{ transformOrigin: "bottom" }}
          variants={lidVariants}
          transition={TRANSITION}
          className="mx-auto h-44 w-[90%] rounded-tl-lg rounded-tr-lg bg-neutral-200 p-1.5 shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-700 dark:shadow-white/5 dark:ring-white/10"
        >
          <div className="relative h-full w-full overflow-hidden rounded-tl rounded-tr-lg rounded-br-sm rounded-bl-sm bg-white dark:bg-neutral-900">
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
                <MacbookDynamicIsland ref={dynamicIslandRef} />
              </div>
            </motion.div>
          </div>
        </motion.div>
        <div className="relative h-3.5 w-full rounded-tl-md rounded-tr-md rounded-br-3xl rounded-bl-3xl bg-linear-to-b from-neutral-200 to-neutral-300 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.05)_inset] dark:from-neutral-600 dark:to-neutral-800">
          <div className="absolute inset-x-0 top-0 mx-auto h-1.5 w-12 rounded-br-sm rounded-bl-sm bg-neutral-400 dark:bg-neutral-500" />
        </div>
      </div>
    </motion.div>
  );
}

function MacbookDynamicIsland({
  ref,
}: {
  ref: React.Ref<DynamicIslandHandle>;
}) {
  const [scope, animate] = useAnimate();
  const hasAnimatedRef = useRef(false);

  const reset = () => {
    hasAnimatedRef.current = false;
    animate(
      scope.current,
      { width: 28, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    animate("#mac-idle", { opacity: 1 }, { duration: 0.15 });
    animate("#mac-loading", { opacity: 0 }, { duration: 0.1 });
    animate("#mac-done", { opacity: 0 }, { duration: 0.1 });
  };

  const start = async () => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    await animate("#mac-idle", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 16, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate("#mac-loading", { opacity: 1 }, { duration: 0.15 });
    await new Promise((r) => setTimeout(r, 1000));
    await animate("#mac-loading", { opacity: 0 }, { duration: 0.1 });
    animate(
      scope.current,
      { width: 48, height: 10, borderRadius: 5 },
      SPRING_OPTIONS,
    );
    await animate("#mac-done", { opacity: 1 }, { duration: 0.15, delay: 0.1 });
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
          id="mac-idle"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 1 }}
        >
          <div className="flex items-center gap-0.5">
            <div className="h-1 w-1 rounded-full bg-neutral-700" />
            <div className="h-0.5 w-0.5 rounded-full bg-neutral-600" />
          </div>
        </div>
        <div
          id="mac-loading"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <MiniLoadingDots />
        </div>
        <div
          id="mac-done"
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <span className="text-[3px] leading-none font-medium text-white">
            Airpods Connected
          </span>
          <div className="ml-0.5 flex h-1 w-2 items-center rounded-xs border border-green-500">
            <div className="h-full w-[85%] bg-green-500" />
          </div>
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
