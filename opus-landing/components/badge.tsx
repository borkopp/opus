"use client";
import React from "react";

import { motion } from "motion/react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

const MotionLink = motion.create(Link);

export const Badge = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <MotionLink
      href={href}
      className="ring-none flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition duration-200 hover:bg-muted active:scale-98"
      whileHover="animate"
      initial="initial"
    >
      {children}{" "}
      <motion.span
        variants={{
          initial: { x: 0 },
          animate: { x: 2 },
        }}
      >
        <IconArrowRight className="size-4" />
      </motion.span>
    </MotionLink>
  );
};
