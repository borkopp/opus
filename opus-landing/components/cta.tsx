"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "./i18n-provider";
import { siteLinks } from "@/lib/site-links";
import { landingCopy } from "@/lib/landing-copy";

export function LaunchBanner() {
  const { locale, messages } = useI18n();
  const copy = messages.cta;
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative flex w-full items-center justify-center overflow-hidden px-4 pt-8 pb-20 md:pb-28">
      <div className="relative mx-auto w-full max-w-7xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: reducedMotion ? 0 : 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative flex flex-col items-center gap-8 overflow-hidden rounded-[40px] border border-neutral-800 bg-neutral-900 p-8 text-center shadow-2xl md:p-16"
        >
          <div className="absolute inset-0 z-0">
            <Image
              src="/bg.jpg"
              alt=""
              fill
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-neutral-900/65" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-5">
            {/* <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 backdrop-blur-sm">
              <IconSparkles className="text-brand-primary size-4" />
              Бесплатно, без временско ограничување
            </div> */}
            <h2 className="max-w-5xl text-4xl leading-[1.1] font-medium tracking-tight text-white md:text-6xl">
              {copy.heading}{" "}
              <span className="text-brand-primary font-lora italic">
                {copy.headingAccent}
              </span>{" "}
              {copy.headingEnd}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-neutral-300 md:text-lg">
              {copy.description}
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <Button
              asChild
              variant="brand"
              size="hero"
              className="group h-14 px-8"
            >
              <Link href={siteLinks.signup}>
                {copy.button}
                <IconArrowRight
                  data-icon="inline-end"
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </Button>
            <p className="text-xs text-white/60">
              {landingCopy[locale].reassurance}
            </p>
            {/* <p className="text-xs text-neutral-400">
              Бесплатно засекогаш · Неограничени термини · Надградба кога ќе
              посакате
            </p> */}
          </div>
        </motion.div>
      </div>

      <div className="border-brand-primary/5 absolute top-1/2 left-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border" />
      <div className="border-brand-primary/5 absolute top-1/2 left-1/2 -z-10 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border" />
    </section>
  );
}

export function CTA() {
  const { messages } = useI18n();
  const copy = messages.cta;

  return (
    <section className="mx-auto my-20 w-full max-w-6xl px-4 md:px-8">
      <div className="relative overflow-hidden rounded-[40px] bg-neutral-900 p-8 text-center md:p-20">
        <div className="relative z-10">
          <h2 className="text-3xl font-medium tracking-tight text-white md:text-5xl">
            {copy.alternateHeading}{" "}
            <span className="text-brand-primary font-lora italic">
              {copy.alternateHeadingAccent}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
            {copy.alternateDescription}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild variant="brand" size="hero" className="h-14 px-10">
              <Link href={siteLinks.signup}>
                {copy.button}
                <IconArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <Image src="/bg.jpg" alt="" fill className="object-cover" />
        </div>

        <div className="bg-brand-primary/20 absolute -top-24 -left-24 size-96 rounded-full blur-[100px]" />
        <div className="bg-brand-primary/10 absolute -right-24 -bottom-24 size-96 rounded-full blur-[100px]" />
      </div>
    </section>
  );
}
