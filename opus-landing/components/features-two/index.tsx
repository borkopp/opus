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
import Image from "next/image";
import { CalendarCheck2, Check } from "lucide-react";
import { landingCopy } from "@/lib/landing-copy";
import { Reveal } from "../ui/reveal";

export function FeaturesTwo({ compact = false }: { compact?: boolean }) {
  const { messages } = useI18n();
  const copy = messages.featuresTwo;

  if (compact) return <CompactFeaturesTwo />;

  return (
    <Container className="px-4 py-10 md:py-20 lg:py-32">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <Heading as="h2" className="mb-4">
          {copy.heading}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.headingAccent}
          </span>
        </Heading>
        <Subheading className="text-balance">{copy.description}</Subheading>
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
          <FeatureDescription>{copy.devices[0].description}</FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <MacbookSkeleton />
          <FeatureTitle>{copy.devices[1].title}</FeatureTitle>
          <FeatureDescription>{copy.devices[1].description}</FeatureDescription>
        </FeatureItem>

        <FeatureItem>
          <IPadSkeleton />
          <FeatureTitle>{copy.devices[2].title}</FeatureTitle>
          <FeatureDescription>{copy.devices[2].description}</FeatureDescription>
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

function CompactFeaturesTwo() {
  const { locale } = useI18n();
  const copy = landingCopy[locale].devices;

  return (
    <Container as="section" className="py-16 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src="/images/features/calendar-tablet-desk.jpg"
              alt={copy.alt}
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <Reveal
            delay={0.2}
            className="absolute inset-x-5 bottom-5 sm:left-auto sm:w-80"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-neutral-950/75 p-4 text-white shadow-lg backdrop-blur-xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <CalendarCheck2 className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{copy.notification}</p>
                <p className="text-xs text-white/60">
                  {landingCopy[locale].journey.tomorrow}, 14:30 ·{" "}
                  {landingCopy[locale].demoLabel}
                </p>
              </div>
            </div>
          </Reveal>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-brand-primary mb-5 text-[11px] font-medium tracking-[0.18em]">
            {copy.eyebrow}
          </p>
          <Heading as="h2">
            {copy.title}{" "}
            <span className="text-brand-primary font-lora italic">
              {copy.accent}
            </span>
          </Heading>
          <p className="text-muted-foreground mt-5 max-w-md text-base leading-relaxed">
            {copy.description}
          </p>
          <ul className="mt-7 flex flex-col gap-4">
            {copy.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm">
                <Check
                  className="text-brand-primary mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {benefit}
              </li>
            ))}
          </ul>
        </Reveal>
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
