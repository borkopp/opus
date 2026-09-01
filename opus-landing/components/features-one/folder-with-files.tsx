"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

export function FolderWithFiles({ className }: { className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [isHovered, setIsHovered] = useState(false);

  const files = [
    "https://assets.aceternity.com/avatars/1.webp",
    "https://assets.aceternity.com/avatars/manu.webp",
    "https://assets.aceternity.com/avatars/8.webp",
  ];

  return (
    <div
      className={cn("flex min-h-60 items-center justify-center p-4", className)}
    >
      <div
        ref={ref}
        className="relative flex h-full items-center justify-center"
      >
        {/* Pulse beams background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="relative h-px w-full">
              {/* Dashed line */}
              <div className="absolute inset-0 border-t border-dashed border-neutral-200 dark:border-neutral-700" />
              {/* Pulse beam */}
              <motion.div
                className="absolute top-0 h-px w-12 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                initial={{ x: "-100%", opacity: 0 }}
                animate={
                  isInView
                    ? {
                        x: ["0%", "800%"],
                        opacity: [0, 1, 1, 0],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "linear",
                }}
              />
            </div>
          ))}
        </div>

        {/* Folder and Server */}
        <div className="relative z-10 flex items-end gap-12">
          {/* Folder with images */}
          <motion.div
            className="relative cursor-pointer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative"
              style={{ width: 72, height: 54, transformStyle: "preserve-3d" }}
            >
              {/* Folder Back */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 shadow-sm dark:from-amber-500 dark:to-amber-600">
                {/* Folder Tab */}
                <div
                  className="absolute left-1.5 rounded-t-sm bg-gradient-to-b from-amber-300 to-amber-400 dark:from-amber-400 dark:to-amber-500"
                  style={{ top: -8, width: 26, height: 10 }}
                />
              </div>

              {/* Images that pop out */}
              {files.map((image, index) => {
                const hoverY = -55 - (2 - index) * 5;
                const hoverX = (index - 1) * 32;
                const hoverRotation = (index - 1) * 12;
                const teaseY = -6 - (2 - index) * 2;
                const teaseRotation = (index - 1) * 3;

                return (
                  <motion.div
                    key={index}
                    className="absolute top-1.5 left-1/2 origin-bottom overflow-hidden rounded bg-white shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-800"
                    animate={{
                      x: `calc(-50% + ${isHovered ? hoverX : 0}px)`,
                      y: isHovered ? hoverY : teaseY,
                      rotate: isHovered ? hoverRotation : teaseRotation,
                      width: isHovered ? 56 : 36,
                      height: isHovered ? 40 : 24,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      delay: index * 0.03,
                    }}
                    style={{ zIndex: 10 + index }}
                  >
                    <img
                      src={image}
                      alt={`File ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                );
              })}

              {/* Folder Front */}
              <motion.div
                className="absolute inset-x-0 bottom-0 h-[85%] origin-bottom rounded-lg bg-gradient-to-b from-amber-300 to-amber-400 shadow-sm dark:from-amber-400 dark:to-amber-500"
                animate={{
                  rotateX: isHovered ? -45 : -25,
                  scaleY: isHovered ? 0.8 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{ transformStyle: "preserve-3d", zIndex: 20 }}
              >
                <div className="absolute top-2 right-2 left-2 h-px bg-amber-200/50 dark:bg-amber-300/50" />
              </motion.div>
            </div>
          </motion.div>

          {/* Server */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div
              className="relative rounded-lg bg-gradient-to-b from-gray-50 to-gray-50 shadow-sm dark:from-neutral-700 dark:to-neutral-800"
              style={{ width: 56, height: 72 }}
            >
              {/* Server top panel with vents */}
              <div className="absolute inset-x-1.5 top-1.5 h-3 rounded-sm bg-white shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-900">
                <div className="flex h-full items-center justify-center gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-px bg-neutral-600 dark:bg-neutral-700"
                    />
                  ))}
                </div>
              </div>

              {/* Drive bays */}
              <div className="absolute right-1.5 bottom-1.5 left-1.5 flex flex-col gap-1">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-4 rounded-sm bg-white shadow-sm ring-1 shadow-black/5 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
                  >
                    <div className="mt-1 ml-1 h-0.5 w-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
