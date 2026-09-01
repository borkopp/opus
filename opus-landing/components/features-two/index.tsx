"use client";
import React from "react";
import { motion } from "motion/react";
import { Container } from "../container";
import { Heading } from "../heading";
import { Subheading } from "../subheading";
import { AnimatedBeamPathIllustration } from "./animated-path";
import { SecuritySkeleton } from "./security-skeleton";
import { MacbookSkeleton } from "./macbook-skeleton";
import { IPhoneSkeleton } from "./iphone-skeleton";
import { IPadSkeleton } from "./ipad-skeleton";
import { EdgeComputing } from "./edge-computing";
import { useI18n } from "../i18n-provider";

export function FeaturesTwo() {
  const { messages } = useI18n();
  const copy = messages.featuresTwo;

  return (
    <Container className="px-4 py-10 md:py-20 lg:py-32">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <Heading as="h2" className="mb-4">
          {copy.heading}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.headingAccent}
          </span>
        </Heading>
        <Subheading className="text-balance">
          {copy.description}
        </Subheading>
      </div>

      {/* Animated beam row - visible only on lg screens */}
      <div className="relative mx-auto mb-8 hidden h-12 w-full items-center lg:flex">
        <div className="relative flex h-full w-full items-center">
          <div className="absolute top-1/2 left-[calc(100%/6)] z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-[calc(500%/6)] z-10 -translate-x-1/2 -translate-y-1/2">
            <BeamCircle />
          </div>
          <div className="absolute top-1/2 left-[calc(100%/6)] w-[calc(200%/6)] -translate-y-1/2">
            <AnimatedBeamPathIllustration />
          </div>
          <div className="absolute top-1/2 left-[calc(300%/6)] w-[calc(200%/6)] -translate-y-1/2">
            <AnimatedBeamPathIllustration delay={1.4} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full grid-cols-1 items-center gap-10 overflow-hidden py-4 md:grid-cols-3 md:flex-row md:items-end md:justify-center md:py-10">
        <FeatureItem>
          <IPhoneSkeleton />
          <FeatureTitle>{copy.devices[0].title}</FeatureTitle>
          <FeatureDescription>
            {copy.devices[0].description}
          </FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <MacbookSkeleton />
          <FeatureTitle>{copy.devices[1].title}</FeatureTitle>
          <FeatureDescription>
            {copy.devices[1].description}
          </FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <IPadSkeleton />
          <FeatureTitle>{copy.devices[2].title}</FeatureTitle>
          <FeatureDescription>
            {copy.devices[2].description}
          </FeatureDescription>
        </FeatureItem>
      </div>

      {/* Additional feature blocks */}
      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        <FeatureBlock
          icon={<SecuritySkeleton />}
          title={copy.blocks[0].title}
          description={copy.blocks[0].description}
        />
        <FeatureBlock
          icon={<EdgeComputing />}
          title={copy.blocks[1].title}
          description={copy.blocks[1].description}
        />
        {/* <FeatureBlock
          icon={<Compliance />}
          title="Локализирано за вас"
          description="Целосна поддршка за македонски јазик, прилагодено за домашниот пазар."
        /> */}
      </div>
    </Container>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover="animate"
      initial="initial"
      className="flex min-w-60 flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

function BeamCircle() {
  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
      <div className="bg-brand-primary h-2 w-2 rounded-full" />
    </div>
  );
}

function FeatureTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-center text-base font-medium text-neutral-900 dark:text-neutral-100">
      {children}
    </h3>
  );
}

function FeatureDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-2 max-w-xs text-center text-sm text-balance text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

function FeatureBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="relative flex min-h-40 items-center justify-center mask-radial-from-20%">
        {/* <Scales size={8} className="-z-1 rounded-lg" /> */}
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-balance text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
