"use client";
import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { createMap } from "svg-dotted-map";

const POSITIONS = [
  { x: 15, y: 25, label: "North America" },
  { x: 75, y: 20, label: "Europe" },
  { x: 85, y: 60, label: "Asia Pacific" },
  { x: 25, y: 70, label: "South America" },
];

const IMAGES = [
  "https://assets.aceternity.com/avatars/shadcn.webp",
  "https://assets.aceternity.com/avatars/2.webp",
  "https://assets.aceternity.com/avatars/3.webp",
  "https://assets.aceternity.com/avatars/4.webp",
];

export const EdgeComputing = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % POSITIONS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const activePosition = POSITIONS[activeIndex];

  return (
    <div className="relative h-40 w-full overflow-hidden">
      <DottedWorldMap />

      <motion.div
        className="absolute flex items-center justify-center"
        animate={{
          left: `${activePosition.x}%`,
          top: `${activePosition.y}%`,
        }}
        style={{
          transform: "translate(-50%, -50%)",
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 25,
        }}
      >
        <motion.div
          className="absolute size-8 rounded-full bg-neutral-200 dark:bg-neutral-700"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div className="relative size-7 overflow-hidden rounded-full ring-2 ring-neutral-300 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900">
          <Image
            src={IMAGES[activeIndex]}
            alt={activePosition.label}
            width={50}
            height={50}
            className="h-full w-full object-cover"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

const MAP_WIDTH = 120;
const MAP_HEIGHT = 60;
const DOT_RADIUS = 0.22;

function DottedWorldMap() {
  const { points, xStep, yToRowIndex } = useMemo(() => {
    const { points } = createMap({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      mapSamples: 6000,
    });

    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const rowMap = new Map<number, number>();
    let step = 0;
    let prevY = Number.NaN;
    let prevXInRow = Number.NaN;

    for (const p of sorted) {
      if (p.y !== prevY) {
        prevY = p.y;
        prevXInRow = Number.NaN;
        if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size);
      }
      if (!Number.isNaN(prevXInRow)) {
        const delta = p.x - prevXInRow;
        if (delta > 0) step = step === 0 ? delta : Math.min(step, delta);
      }
      prevXInRow = p.x;
    }

    return { points, xStep: step || 1, yToRowIndex: rowMap };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="h-full w-full text-neutral-300 dark:text-neutral-600"
      preserveAspectRatio="xMidYMid slice"
    >
      {points.map((point, index) => {
        const rowIndex = yToRowIndex.get(point.y) ?? 0;
        const offsetX = rowIndex % 2 === 1 ? xStep / 2 : 0;
        return (
          <circle
            cx={point.x + offsetX}
            cy={point.y}
            r={DOT_RADIUS}
            fill="currentColor"
            key={`${point.x}-${point.y}-${index}`}
          />
        );
      })}
    </svg>
  );
}
