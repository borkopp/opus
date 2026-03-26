"use client";
import React, { useState, useRef, useEffect } from "react";
import { Easing, motion, stagger, useAnimate } from "motion/react";

interface MacbookIllustrationProps {
  content?: React.ReactNode;
}

export default function MacbookIllustrationWithIcons({
  content,
}: MacbookIllustrationProps) {
  const [isHovered, setIsHovered] = useState(false);

  const lidVariants = {
    initial: {
      rotateX: -60,
    },
    animate: {
      rotateX: 20,
    },
  };

  const screenContentVariants = {
    initial: {
      opacity: 0,
      filter: "blur(8px)",
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
    },
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

  const images = [
    {
      src: "https://assets.aceternity.com/logos/perplexity.webp",
      alt: "Perplexity icon",
      rotate: 4,
    },
    {
      src: "https://assets.aceternity.com/logos/openai.webp",
      alt: "OpenAI icon",
      rotate: -3,
    },
    {
      src: "https://assets.aceternity.com/logos/anthropic.webp",
      alt: "Anthropic icon",
      rotate: 2,
    },
  ];

  return (
    <motion.div
      whileHover="animate"
      initial="initial"
      whileTap="animate"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="mx-auto w-64 perspective-distant">
        <motion.div className="absolute inset-0 z-100 flex items-center justify-center gap-8">
          {images.map((image, index) => (
            <motion.div
              variants={{
                initial: {
                  y: 60,
                  scale: 0.4,
                  filter: "blur(10px)",
                  opacity: 0,
                  rotate: 0,
                },
                animate: {
                  y: -20,
                  scale: 1,
                  filter: "blur(0px)",
                  opacity: 1,
                  rotate: image.rotate,
                },
              }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
                delay: 0.5 + 0.05 * index,
              }}
              key={image.alt + "illustration"}
              className="flex size-16 items-center justify-center rounded-lg bg-white shadow-[0_8px_8px_-3px_rgba(0,0,0,0.04),0_3px_3px_-1.5px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.04),0_-1px_2px_0px_var(--color-white)_inset] dark:bg-neutral-950 dark:text-neutral-300 dark:shadow-[0_8px_8px_-3px_rgba(255,255,255,0.02),0_0_0_1px_rgba(255,255,255,0.1),0_-1px_2px_0px_var(--color-black)_inset]"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="size-10 object-cover dark:invert dark:filter"
              />
            </motion.div>
          ))}
        </motion.div>
        {/* lid */}
        <motion.div
          style={{
            transformOrigin: "bottom",
          }}
          variants={lidVariants}
          transition={TRANSITION}
          className="mx-auto h-32 w-[90%] rounded-tl-lg rounded-tr-lg bg-neutral-100 p-1 shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-800 dark:shadow-white/5 dark:ring-white/10"
        >
          <div className="lg relative h-full w-full overflow-hidden rounded-tl rounded-tr-lg rounded-br-sm rounded-bl-sm bg-white dark:bg-neutral-900">
            <motion.div
              variants={screenContentVariants}
              transition={CONTENT_TRANSITION}
              className="absolute inset-0"
            >
              {content ?? <ScreenContent isActive={isHovered} />}
            </motion.div>
          </div>
        </motion.div>
        <div className="relative h-3 w-full rounded-tl-md rounded-tr-md rounded-br-3xl rounded-bl-3xl bg-linear-to-b from-neutral-100 to-neutral-300 shadow-[0px_1px_0px_0px_var(--color-neutral-200)_inset] dark:from-neutral-700 dark:to-neutral-900 dark:shadow-[0px_1px_0px_0px_var(--color-neutral-600)_inset]">
          <div className="absolute inset-x-0 top-0 mx-auto h-1.5 w-10 rounded-br-sm rounded-bl-sm bg-neutral-400 shadow-[0px_-1px_0px_0px_var(--color-neutral-300)_inset] dark:bg-neutral-600 dark:shadow-[0px_-1px_0px_0px_var(--color-neutral-500)_inset]"></div>
        </div>
      </div>
    </motion.div>
  );
}

const ScreenContent: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <>
      <img
        src="https://assets.aceternity.com/components/pricing-with-header-and-icons.webp"
        alt="Laptop screen content"
        className="object-cover"
      />
    </>
  );
};
