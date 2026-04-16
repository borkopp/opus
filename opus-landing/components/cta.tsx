"use client";

import { IconArrowRight } from "@tabler/icons-react";
import Image from "next/image";
import { Button } from "./button";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

const images = [
  {
    src: "https://assets.aceternity.com/components/pricing-minimal.webp",
    alt: "Creative product workspace",
  },
  {
    src: "https://assets.aceternity.com/components/contact-section-with-shader.webp",
    alt: "Team collaboration desk setup",
  },
  {
    src: "https://assets.aceternity.com/components/feature-section-with-bento-skeletons.webp",
    alt: "Developer dashboard on laptop",
  },
  {
    src: "https://assets.aceternity.com/components/features-with-isometric-blocks.webp",
    alt: "Design system components layout",
  },
  {
    src: "https://assets.aceternity.com/components/illustrations.webp",
    alt: "Code editor with app interface",
  },
  {
    src: "https://assets.aceternity.com/components/globe-3.webp",
    alt: "UI mockups and product visuals",
  },
];

const SPRING_CONFIG = {
  stiffness: 100,
  damping: 50,
};

export function CTA() {
  const target = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: target,
    offset: ["start start", "end end"],
  });

  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 100]),
    SPRING_CONFIG,
  );
  const translateYNegative = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -100]),
    SPRING_CONFIG,
  );

  return (
    <section
      ref={target}
      className="mx-auto my-10 grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:my-16 md:grid-cols-2 md:gap-16 md:px-8"
    >
      <div className="max-w-xl">
        <Heading
          as="h2"
          className="text-3xl font-bold tracking-tight text-balance text-black md:text-4xl dark:text-white"
        >
          Подготвени сте да го унапредите вашиот бизнис?
        </Heading>
        <Subheading className="mt-6 max-w-lg text-base text-neutral-600 md:text-base dark:text-neutral-400">
          Регистрирајте се за помалку од 2 минути и започнете со бесплатниот пробен период од 3 месеци. Без скриени трошоци.
        </Subheading>
        <Button className="mt-6">
          <span>Започнете сега</span>
          <IconArrowRight className="mt-0.5 h-4 w-4 text-white transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </div>

      <div className="relative max-h-140 overflow-hidden rounded-2xl bg-white/60 mask-t-from-50% mask-b-from-50% p-3 dark:bg-neutral-950/50">
        <div className="grid h-full grid-cols-2 gap-3">
          <motion.div className="flex flex-col gap-3" style={{ y: translateY }}>
            {images.slice(0, 3).map((image) => (
              <div
                key={image.src}
                className="overflow-hidden rounded-xl shadow-sm ring-1 shadow-black/10 ring-black/5"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={500}
                  height={320}
                  className="h-44 w-full object-cover"
                />
              </div>
            ))}
          </motion.div>
          <motion.div
            className="mt-10 flex flex-col gap-3"
            style={{ y: translateYNegative }}
          >
            {images.slice(3).map((image) => (
              <div
                key={image.src}
                className="overflow-hidden rounded-xl shadow-sm ring-1 shadow-black/10 ring-black/5"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={500}
                  height={320}
                  className="h-44 w-full object-cover"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
