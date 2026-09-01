"use client";

import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Container } from "./container";
import { useI18n } from "./i18n-provider";

interface Stat {
  value: number | string;
  suffix: string;
  label: string;
  description: string;
  delay: number;
}

const STAT_VALUES = [
  { value: "∞", delay: 0.1 },
  { value: 0, delay: 0.2 },
  { value: 1, delay: 0.3 },
  { value: 24, delay: 0.4 },
] as const;

const css = `
.candy-pattern {
    background-image: linear-gradient(
      135deg,
      rgba(206,93,69,0.04) 25%,
      transparent 25.5%,
      transparent 50%,
      rgba(206,93,69,0.04) 50.5%,
      rgba(206,93,69,0.04) 75%,
      transparent 75.5%,
      transparent
    );
    background-size: 14px 14px;
}
`;

const Stats = () => {
  const { messages } = useI18n();
  const copy = messages.stats;
  const stats: Stat[] = copy.items.map((item, index) => ({
    ...item,
    ...STAT_VALUES[index],
  }));

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <style>{css}</style>
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" className="mb-4">
            {copy.heading}{" "}
            <span className="text-brand-primary font-lora italic">
              {copy.headingAccent}
            </span>
          </Heading>
          <Subheading>{copy.description}</Subheading>
        </div>
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatWrapper key={index} stat={stat} />
          ))}
        </div>
      </Container>

      {/* Subtle background glow */}
      <div className="bg-brand-primary/5 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />
    </section>
  );
};

export { Stats };

const StatWrapper = ({ stat }: { stat: Stat }) => {
  const [isActive, setIsActive] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      onViewportEnter={() => setIsActive(true)}
      transition={{
        duration: 0.5,
        delay: stat.delay,
        ease: "easeOut",
      }}
      className="h-full"
    >
      <StatCard {...stat} isActive={isActive} />
    </motion.div>
  );
};

const StatCard = ({
  value,
  suffix,
  label,
  description,
  isActive,
}: {
  value: number | string;
  suffix: string;
  label: string;
  description: string;
  isActive: boolean;
}) => {
  return (
    <div className="group hover:shadow-brand-primary/5 relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-neutral-200/60 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-neutral-800/60 dark:bg-neutral-900">
      {/* Ambient hover pattern */}
      <div className="candy-pattern absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="mb-8 flex flex-col items-start">
        <div className="relative inline-flex items-baseline justify-start gap-1 pb-1">
          {typeof value === "number" ? (
            <NumberFlow
              value={isActive ? value : 0}
              className="text-5xl font-bold tracking-tight text-neutral-900 md:text-6xl dark:text-white"
            />
          ) : (
            <span className="text-5xl font-bold tracking-tight text-neutral-900 md:text-6xl dark:text-white">
              {value}
            </span>
          )}
          <span className="text-brand-primary text-2xl font-semibold md:text-3xl">
            {suffix}
          </span>
        </div>
        {/* Decorative dynamic line */}
        <div className="group-hover:bg-brand-primary/40 mt-6 h-1 w-12 rounded-full bg-neutral-100 transition-all duration-500 group-hover:w-full dark:bg-neutral-800" />
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {label}
        </h3>
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
};
