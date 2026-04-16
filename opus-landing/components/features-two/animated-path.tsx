"use client";
import React, { useId } from "react";
import { motion } from "motion/react";

export function AnimatedBeamPathIllustration({
  delay = 0,
}: {
  delay?: number;
}) {
  const path = "M 0 40 L 100 40 L 200 15 L 400 15 L 500 40 L 600 40";
  const id = useId();

  const fadeMaskId = `fadeMask-${id}`;
  const beamGradientId = `beamGradient-${id}`;
  const glowId = `glow-${id}`;
  const fadeEndsMaskId = `fadeEndsMask-${id}`;
  const beamFadeGradientId = `beamFadeGradient-${id}`;
  const beamMaskId = `beamMask-${id}`;

  return (
    <div className="flex h-full w-full shrink-0 items-center justify-center overflow-visible [--beam-color-1:var(--color-brand-primary)] [--beam-color-2:var(--color-brand-primary)] [--beam-color-3:var(--color-brand-primary)] [--path-color:var(--color-neutral-300)] dark:[--beam-color-1:var(--color-brand-primary)] dark:[--beam-color-2:var(--color-brand-primary)] dark:[--beam-color-3:var(--color-brand-primary)] dark:[--path-color:var(--color-neutral-700)]">
      <svg
        className="h-12 w-full"
        viewBox="0 0 600 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={fadeMaskId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>

          <linearGradient id={beamGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="30%" stopColor="var(--beam-color-1)" />
            <stop offset="50%" stopColor="var(--beam-color-2)" />
            <stop offset="70%" stopColor="var(--beam-color-3)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <mask id={fadeEndsMaskId}>
            <rect
              x="0"
              y="0"
              width="600"
              height="80"
              fill={`url(#${fadeMaskId})`}
            />
          </mask>

          <linearGradient
            id={beamFadeGradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="600"
            y2="0"
          >
            <motion.stop
              offset="0%"
              stopColor="black"
              animate={{
                offset: ["-25%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1,
                delay,
              }}
            />
            <motion.stop
              offset="5%"
              stopColor="white"
              animate={{
                offset: ["-20%", "105%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1,
                delay,
              }}
            />
            <motion.stop
              offset="15%"
              stopColor="white"
              animate={{
                offset: ["-10%", "115%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1,
                delay,
              }}
            />
            <motion.stop
              offset="20%"
              stopColor="black"
              animate={{
                offset: ["-5%", "120%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1,
                delay,
              }}
            />
          </linearGradient>

          <mask id={beamMaskId}>
            <path
              d={path}
              stroke={`url(#${beamFadeGradientId})`}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </mask>
        </defs>

        <g mask={`url(#${fadeEndsMaskId})`}>
          <path
            d={path}
            stroke="var(--path-color)"
            strokeWidth="2"
            strokeDasharray="1 6"
            strokeLinecap="round"
            fill="none"
          />

          <g filter={`url(#${glowId})`}>
            <path
              d={path}
              stroke={`url(#${beamGradientId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="1 6"
              fill="none"
              mask={`url(#${beamMaskId})`}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
