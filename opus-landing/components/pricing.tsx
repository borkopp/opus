"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Star } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Container } from "./container";
import { Button } from "@/components/ui/button";
import * as PricingCardUI from "@/components/ui/pricing-card";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import Link from "next/link";

const plan = {
  id: "premium",
  title: "OPUS План",
  description: "Бесплатно првите 3 месеци, потоа само 20€ месечно. По цена само за 2-3 пропуштени резервации. Откажете во секое време.",
  price: "20",
  priceComparison: "≈ 2-3 пропуштени резервации",
  features: [
    "Онлајн резервации 24/7",
    "Управување со тим и услуги",
    "AI Асистент & Автоматизација",
    "Напредни извештаи и аналитика",
    "Автоматски потсетници (SMS/Email)",
  ],
  bonusFeatures: [
    "Бесплатен домен",
    "Интеграција за онлајн плаќања",
    "Бесплатна техничка поддршка",
  ],
  buttonText: "Започнете бесплатно",
};

export function Pricing() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <Container as="section" className="relative py-12 md:py-24 overflow-hidden" id="pricing">
      {/* Subtle dotted grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(206,93,69,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(circle at 50% 50%, black, transparent 80%)',
        }}
      />

      {/* Radial spotlight */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full z-0',
          'bg-[radial-gradient(circle_at_center,rgba(206,93,69,0.08),transparent_70%)]',
          'blur-[80px]',
        )}
      />

      <div className="relative z-10 mx-auto mb-16 flex flex-col items-center">
        <Heading
          as="h2"
          className="pt-4 text-center text-2xl font-medium tracking-tight text-neutral-800 md:text-4xl dark:text-neutral-100"
        >
          Едноставен<span className="text-brand-primary font-playfair italic"> ценовник</span>
        </Heading>
        <Subheading className="mx-auto mt-4 max-w-md text-center text-base text-neutral-600 dark:text-neutral-300">
          Започнете бесплатно без никаков ризик. Нема скриени трошоци.
        </Subheading>
      </div>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-center p-4"
      >
        <PricingCardUI.Card className="max-w-md border-neutral-200/60 dark:border-neutral-800/60 shadow-2xl backdrop-blur-md">
          <PricingCardUI.Header>
            <PricingCardUI.Plan>
              <PricingCardUI.PlanName>
                <span className="text-neutral-900 dark:text-neutral-100 font-bold">{plan.title}</span>
              </PricingCardUI.PlanName>
              <PricingCardUI.Badge className="bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-bold">All-in-one</PricingCardUI.Badge>
            </PricingCardUI.Plan>
            <PricingCardUI.Price>
              <PricingCardUI.MainPrice className="text-neutral-900 dark:text-white text-4xl">{plan.price}€</PricingCardUI.MainPrice>
              <PricingCardUI.Period className="text-neutral-500 font-medium">/ месечно</PricingCardUI.Period>
              <div className="text-neutral-400 dark:text-neutral-600 font-medium ml-auto text-sm sm:text-md self-center">
                {plan.priceComparison}
              </div>
            </PricingCardUI.Price>
            <PricingCardUI.Description className="mb-6 -mt-1 leading-relaxed text-neutral-600 dark:text-neutral-400">
              {plan.description}
            </PricingCardUI.Description>
            <Link target="_blank" href="https://app.opus.mk">
              <Button

                className={cn(
                  'w-full font-bold text-white py-6 text-base',
                  'bg-brand-primary hover:bg-brand-primary/80 shadow-[0_10px_30px_rgba(206,93,69,0.3)] transition-all active:scale-[0.98]',
                )}
              >
                {plan.buttonText}
              </Button>
            </Link>
          </PricingCardUI.Header>
          <PricingCardUI.Body>
            <PricingCardUI.List>
              {plan.features.map((item) => (
                <PricingCardUI.ListItem key={item} className="text-neutral-700 dark:text-neutral-300">
                  <span className="mt-1 flex-shrink-0">
                    <CheckCircle2
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-medium">{item}</span>
                </PricingCardUI.ListItem>
              ))}
            </PricingCardUI.List>
            {/* <PricingCardUI.Separator className="text-neutral-400 py-2">Дополнителни бенефити</PricingCardUI.Separator> */}
            {/* <PricingCardUI.List>
              {plan.bonusFeatures.map((item) => (
                <PricingCardUI.ListItem key={item} className="text-neutral-600 dark:text-neutral-400">
                  <span className="mt-1 flex-shrink-0">
                    <CheckCircle2
                      className="h-4 w-4 text-brand-primary opacity-60"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-medium italic">{item}</span>
                </PricingCardUI.ListItem>
              ))}
            </PricingCardUI.List> */}
          </PricingCardUI.Body>
        </PricingCardUI.Card>
      </motion.div>
    </Container>
  );
}
