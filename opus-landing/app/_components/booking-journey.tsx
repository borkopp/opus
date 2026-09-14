"use client";

import { useRef, useState } from "react";
import { Tabs } from "radix-ui";
import { ArrowUpRight, Check, Globe2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { useI18n } from "@/components/i18n-provider";
import { Reveal } from "@/components/ui/reveal";
import { landingCopy } from "@/lib/landing-copy";
import { cn } from "@/lib/utils";
import {
  BookingPreview,
  SetupPreview,
  SharePreview,
} from "./booking-journey-preview";

const steps = ["setup", "share", "book"] as const;

export function BookingJourney() {
  const { locale } = useI18n();
  const copy = landingCopy[locale];
  const [activeStep, setActiveStep] = useState<string>("setup");
  const [keyboard, setKeyboard] = useState(false);
  const bookingStep = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const instant = Boolean(reducedMotion || keyboard);

  return (
    <Container as="section" id="how-it-works" className="py-20 md:py-28">
      <Reveal>
        <p className="text-brand-primary mb-5 text-[11px] font-medium tracking-[0.18em]">
          {copy.journey.eyebrow}
        </p>
        <Heading as="h2" className="max-w-3xl">
          {copy.journey.title}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.journey.accent}
          </span>
        </Heading>
        <p className="text-muted-foreground mt-5 max-w-xl text-base leading-relaxed">
          {copy.journey.description}
        </p>
      </Reveal>

      <Tabs.Root
        value={activeStep}
        onValueChange={setActiveStep}
        orientation="vertical"
      >
        <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <Tabs.List
              aria-label={copy.howItWorks}
              onKeyDownCapture={() => setKeyboard(true)}
              onPointerDownCapture={() => setKeyboard(false)}
              className="flex flex-col"
            >
              {steps.map((step, index) => (
                <Tabs.Trigger
                  key={step}
                  value={step}
                  ref={step === "book" ? bookingStep : undefined}
                  className="group border-border focus-visible:outline-ring relative flex cursor-pointer gap-5 border-b py-6 text-left outline-offset-4 focus-visible:outline-2"
                >
                  <span className="text-muted-foreground group-data-[state=active]:text-brand-primary pt-1 font-mono text-xs transition-colors">
                    0{index + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-foreground text-lg font-medium">
                      {copy.journey.steps[index].title}
                    </span>
                    <span className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                      {copy.journey.steps[index].description}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-brand-primary mt-1 size-4 shrink-0 opacity-0 transition-opacity group-data-[state=active]:opacity-100"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "bg-brand-primary absolute inset-x-0 -bottom-px h-px origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      activeStep === step ? "scale-x-100" : "scale-x-0",
                      keyboard && "duration-0",
                    )}
                  />
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Reveal>

          <Reveal delay={0.08} className="min-w-0">
            <div className="border-border bg-muted/30 relative overflow-hidden rounded-3xl border p-3 shadow-[0_20px_80px_-35px_rgba(206,93,69,0.18)] sm:p-5">
              <div className="bg-brand-primary/5 pointer-events-none absolute -top-20 -right-20 size-72 rounded-full blur-3xl" />
              <div className="border-border bg-background relative overflow-hidden rounded-2xl border">
                <div className="text-muted-foreground border-border flex min-h-14 items-center justify-between gap-3 border-b px-5 text-xs">
                  <span className="flex items-center gap-2">
                    <Globe2 className="size-3.5" aria-hidden="true" />
                    {copy.journey.studio}
                  </span>
                  <span>{copy.demoLabel}</span>
                </div>
                <div className="grid min-h-[25rem]">
                  {steps.map((step) => (
                    <Tabs.Content key={step} value={step} forceMount asChild>
                      <motion.div
                        inert={activeStep !== step}
                        aria-hidden={activeStep !== step}
                        initial={false}
                        animate={{
                          opacity: activeStep === step ? 1 : 0,
                          transform:
                            instant || activeStep === step
                              ? "translateY(0px)"
                              : "translateY(10px)",
                        }}
                        transition={{
                          duration: instant ? 0 : 0.24,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          "col-start-1 row-start-1 flex min-w-0 flex-col p-5 outline-none sm:p-8",
                          activeStep !== step && "pointer-events-none",
                        )}
                      >
                        {step === "setup" && <SetupPreview />}
                        {step === "share" && (
                          <SharePreview
                            onTryBooking={() => {
                              setActiveStep("book");
                              bookingStep.current?.focus({
                                preventScroll: true,
                              });
                            }}
                          />
                        )}
                        {step === "book" && <BookingPreview />}
                      </motion.div>
                    </Tabs.Content>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground relative mt-4 flex items-center justify-center gap-2 text-center text-[11px]">
                <Check className="size-3 shrink-0" aria-hidden="true" />
                {copy.journey.noBooking}
              </p>
            </div>
          </Reveal>
        </div>
      </Tabs.Root>
    </Container>
  );
}
