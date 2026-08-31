"use client";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { GridLineHorizontal, GridLineVertical } from "../grid-lines";
import { Bell, CalendarCheck } from "lucide-react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

const SPARKLE_COLORS = [
  "var(--color-brand-primary)",
  "var(--color-brand-secondary)",
];

function generateSparkles(): Sparkle[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 10 - 15,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    delay: Math.random() * 0.3,
  }));
}

const items = [
  {
    type: "Потсетник",
    message: "Термин кај Марко за 1 час",
    time: "14:30",
    icon: <Bell className="size-8" />,
    color: "bg-highlight/15 text-warning",
  },
  {
    type: "Резервација",
    message: "Нов термин од Ана",
    time: "Закажано: 18:00",
    icon: <CalendarCheck className="size-8" />,
    color: "bg-success/15 text-success",
  },
];

const NotificationCard = ({ item, isGrayscale }: { item: typeof items[0], isGrayscale?: boolean }) => (
  <div className={cn("flex h-full w-full flex-col justify-center items-center gap-4 bg-card p-6", isGrayscale ? "grayscale opacity-40 blur-[1px]" : "")}>
    <div className={cn("flex size-16 items-center justify-center rounded-full", item.color)}>
      {item.icon}
    </div>
    <div className="text-center">
      <div className="text-sm font-semibold text-foreground">{item.type}</div>
      <div className="mt-1 px-2 text-xs text-balance text-muted-foreground">{item.message}</div>
    </div>
    <div className="mt-1 rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
      {item.time}
    </div>
  </div>
);

export function FlippingImagesWithBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"appear" | "scanning" | "flipping">("appear");
  const [barProgress, setBarProgress] = useState(0);
  const [sparkles, setSparkles] = useState<Sparkle[]>(() => generateSparkles());
  const sparklesRef = useRef<Sparkle[]>(sparkles);

  useEffect(() => {
    if (phase === "appear") {
      const timer = setTimeout(() => setPhase("scanning"), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, currentIndex]);

  useEffect(() => {
    if (phase === "scanning") {
      const newSparkles = generateSparkles();
      sparklesRef.current = newSparkles;

      const duration = 2000;
      const startTime = Date.now();
      let isFirstFrame = true;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (isFirstFrame) {
          setSparkles(sparklesRef.current);
          isFirstFrame = false;
        }

        setBarProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => {
            setPhase("flipping");
          }, 100);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "flipping") {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setBarProgress(0);
        setPhase("appear");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const currentItem = items[currentIndex];

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative h-60 w-52 rounded-lg bg-muted p-4 dark:bg-secondary/50">
        <GridLineHorizontal className="top-0" offset="200px" />
        <GridLineHorizontal className="top-auto bottom-0" offset="200px" />
        <GridLineVertical className="left-0" offset="80px" />
        <GridLineVertical className="right-0 left-auto" offset="80px" />
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-card shadow-sm ring-1 shadow-foreground/10 ring-foreground/5 dark:bg-secondary">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              className="absolute inset-0"
              initial={{ filter: "blur(12px)", opacity: 0 }}
              animate={{
                filter: phase === "flipping" ? "blur(12px)" : "blur(0px)",
                opacity: phase === "flipping" ? 0 : 1,
              }}
              exit={{ filter: "blur(12px)", opacity: 0 }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
              }}
            >
              {/* Grayscale UI (base layer) */}
              <div className="absolute inset-0">
                <NotificationCard item={currentItem} isGrayscale />
              </div>

              {/* Colored UI revealed by bar */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  clipPath: `inset(0 ${100 - barProgress * 100}% 0 0)`,
                }}
              >
                <NotificationCard item={currentItem} />
              </div>

              {/* Scanning bar */}
              {phase === "scanning" && (
                <motion.div
                  className="absolute top-0 bottom-0 w-px bg-linear-to-b from-transparent via-brand-primary to-transparent"
                  style={{
                    left: `${barProgress * 100}%`,
                    boxShadow:
                      "0 0 20px color-mix(in srgb, var(--brand) 90%, transparent), 0 0 40px color-mix(in srgb, var(--brand) 70%, transparent), 0 0 60px color-mix(in srgb, var(--brand) 50%, transparent)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Sparkles on the left side of the bar */}
                  {sparkles.map((sparkle) => (
                    <motion.span
                      key={sparkle.id}
                      className="absolute rounded-full"
                      style={{
                        left: sparkle.x,
                        top: `${sparkle.y}%`,
                        width: sparkle.size,
                        height: sparkle.size,
                        backgroundColor: sparkle.color,
                        boxShadow: `0 0 ${sparkle.size / 2}px ${sparkle.color}`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: [0, -10, -20],
                      }}
                      transition={{
                        duration: 0.6,
                        delay: sparkle.delay,
                        repeat: Infinity,
                        repeatDelay: 0.2,
                      }}
                    />
                  ))}

                  {/* Additional trailing sparkles */}
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={`trail-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: -8 - i * 4,
                        top: `${20 + i * 15}%`,
                        width: 2,
                        height: 2,
                        backgroundColor:
                          SPARKLE_COLORS[i % SPARKLE_COLORS.length],
                      }}
                      animate={{
                        opacity: [0.8, 0],
                        scale: [1, 0],
                      }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
