"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import React, { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Container } from "./container";
import { Button } from "@/components/ui/button";
import * as PricingCardUI from "@/components/ui/pricing-card";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import Link from "next/link";
import { useI18n } from "./i18n-provider";

export function Pricing() {
  const { messages } = useI18n();
  const copy = messages.pricing;
  const plans = [
    {
      id: "free",
      ...copy.plans[0],
      popular: false,
      buttonHref: "https://studio.opus.mk",
    },
    {
      id: "pro",
      ...copy.plans[1],
      popular: true,
      buttonHref: "https://opus.mk/contact",
    },
  ];
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  return (
    <Container
      as="section"
      className="relative overflow-hidden py-12 md:py-24"
      id="pricing"
    >
      {/* Subtle dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(206,93,69,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(circle at 50% 50%, black, transparent 80%)",
        }}
      />

      {/* Radial spotlight */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-1/2 z-0 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full",
          "bg-[radial-gradient(circle_at_center,rgba(206,93,69,0.08),transparent_70%)]",
          "blur-[80px]",
        )}
      />

      <div className="relative z-10 mx-auto mb-12 flex flex-col items-center md:mb-16">
        <Heading
          as="h2"
          className="pt-4 text-center text-2xl font-medium tracking-tight text-neutral-800 md:text-4xl dark:text-neutral-100"
        >
          {copy.heading}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.headingAccent}
          </span>
        </Heading>
        <Subheading className="mx-auto mt-4 max-w-xl text-center text-base text-neutral-600 dark:text-neutral-300">
          {copy.description}
        </Subheading>
      </div>

      <div
        ref={containerRef}
        className="relative z-10 mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-6 p-2 sm:p-4 md:grid-cols-2"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{
              duration: 0.6,
              delay: index * 0.15,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="flex w-full"
          >
            <PricingCardUI.Card
              className={cn(
                "flex w-full max-w-none flex-col justify-between rounded-2xl p-2 transition-all duration-300",
                plan.popular
                  ? "border-brand-primary/40 dark:border-brand-primary/50 ring-brand-primary/30 bg-white/95 shadow-2xl ring-1 dark:bg-neutral-900/90"
                  : "border-neutral-200/80 bg-white/80 shadow-xl dark:border-neutral-800/80 dark:bg-neutral-900/70",
              )}
            >
              <PricingCardUI.Header
                className={cn(
                  "rounded-xl p-5 sm:p-6",
                  plan.popular
                    ? "bg-brand-primary/[0.03] dark:bg-brand-primary/[0.05]"
                    : "bg-neutral-50/80 dark:bg-neutral-800/40",
                )}
              >
                <PricingCardUI.Plan className="mb-6 flex items-center justify-between">
                  <PricingCardUI.PlanName>
                    <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {plan.title}
                    </span>
                  </PricingCardUI.PlanName>
                  <PricingCardUI.Badge
                    className={cn(
                      "px-2.5 py-0.5 text-xs font-semibold",
                      plan.popular
                        ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-bold"
                        : "border-neutral-300 bg-neutral-200/60 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                    )}
                  >
                    {plan.badge}
                  </PricingCardUI.Badge>
                </PricingCardUI.Plan>

                <PricingCardUI.Price className="mb-3 flex items-baseline gap-1">
                  <PricingCardUI.MainPrice className="text-4xl font-extrabold text-neutral-900 dark:text-white">
                    {plan.price} {plan.currency}
                  </PricingCardUI.MainPrice>
                  <PricingCardUI.Period className="text-sm font-medium text-neutral-500">
                    {plan.period}
                  </PricingCardUI.Period>
                </PricingCardUI.Price>

                <PricingCardUI.Description className="mb-6 min-h-[3rem] text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {plan.description}
                </PricingCardUI.Description>

                <Link href={plan.buttonHref} className="block w-full">
                  <Button
                    className={cn(
                      "w-full rounded-xl py-6 text-sm font-bold transition-all active:scale-[0.98] sm:text-base",
                      plan.popular
                        ? "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-[0_10px_30px_rgba(206,93,69,0.25)]"
                        : "border border-neutral-300 bg-white text-neutral-900 shadow-xs hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700",
                    )}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {plan.buttonText}
                    </span>
                  </Button>
                </Link>
              </PricingCardUI.Header>

              <PricingCardUI.Body className="p-4 sm:p-5">
                <PricingCardUI.List className="space-y-3">
                  {plan.features.map((item) => (
                    <PricingCardUI.ListItem
                      key={item}
                      className="flex items-start gap-2.5 text-xs text-neutral-700 sm:text-sm dark:text-neutral-300"
                    >
                      <span className="mt-0.5 shrink-0">
                        <CheckCircle2
                          className={cn(
                            "size-4",
                            plan.popular
                              ? "text-brand-primary"
                              : "text-emerald-500",
                          )}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="font-medium">{item}</span>
                    </PricingCardUI.ListItem>
                  ))}
                </PricingCardUI.List>
              </PricingCardUI.Body>
            </PricingCardUI.Card>
          </motion.div>
        ))}
      </div>
    </Container>
  );
}
