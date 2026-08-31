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

const plan = {
  id: "premium",
  title: "OPUS План",
  description:
    "Бесплатно првите 3 месеци, потоа само 20€ месечно. По цена само за 2-3 пропуштени резервации. Откажете во секое време.",
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
    "Сопствена opus.mk веб-страница",
    "Интеграција за онлајн плаќања",
    "Бесплатна техничка поддршка",
  ],
  buttonText: "Започнете бесплатно",
};

export function Pricing() {
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
            "radial-gradient(color-mix(in srgb, var(--brand) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(circle at 50% 50%, black, transparent 80%)",
        }}
      />

      {/* Radial spotlight */}
      <div
        aria-hidden="true"
        className="bg-primary/8 pointer-events-none absolute top-0 left-1/2 z-0 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
      />

      <div className="relative z-10 mx-auto mb-16 flex flex-col items-center">
        <Heading as="h2" className="pt-4 text-center text-2xl md:text-4xl">
          Едноставен ценовник
        </Heading>
        <Subheading className="mx-auto mt-4 max-w-md text-center text-base">
          Започнете бесплатно без никаков ризик. Нема скриени трошоци.
        </Subheading>
      </div>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-center p-4"
      >
        <PricingCardUI.Card className="border-border max-w-md shadow-lg backdrop-blur-md">
          <PricingCardUI.Header>
            <PricingCardUI.Plan>
              <PricingCardUI.PlanName>
                <span className="text-foreground font-bold">{plan.title}</span>
              </PricingCardUI.PlanName>
              <PricingCardUI.Badge className="bg-primary/10 border-primary/20 text-primary font-bold">
                All-in-one
              </PricingCardUI.Badge>
            </PricingCardUI.Plan>
            <PricingCardUI.Price>
              <PricingCardUI.MainPrice className="text-foreground text-4xl">
                {plan.price}€
              </PricingCardUI.MainPrice>
              <PricingCardUI.Period className="text-muted-foreground font-medium">
                / месечно
              </PricingCardUI.Period>
              <div className="text-muted-foreground sm:text-md ml-auto self-center text-sm font-medium">
                {plan.priceComparison}
              </div>
            </PricingCardUI.Price>
            <PricingCardUI.Description className="text-muted-foreground -mt-1 mb-6 leading-relaxed">
              {plan.description}
            </PricingCardUI.Description>
            <Link target="_blank" href="https://studio.opus.mk">
              <Button
                className={cn(
                  "text-primary-foreground w-full py-6 text-base font-bold",
                  "bg-primary hover:bg-primary/90 shadow-brand-primary/20 shadow-md transition-all active:scale-[0.98]",
                )}
              >
                {plan.buttonText}
              </Button>
            </Link>
          </PricingCardUI.Header>
          <PricingCardUI.Body>
            <PricingCardUI.List>
              {plan.features.map((item) => (
                <PricingCardUI.ListItem key={item} className="text-foreground">
                  <span className="mt-1 flex-shrink-0">
                    <CheckCircle2
                      className="text-success h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-medium">{item}</span>
                </PricingCardUI.ListItem>
              ))}
            </PricingCardUI.List>
            {/* <PricingCardUI.Separator className="text-muted-foreground py-2">Дополнителни бенефити</PricingCardUI.Separator> */}
            {/* <PricingCardUI.List>
              {plan.bonusFeatures.map((item) => (
                <PricingCardUI.ListItem key={item} className="text-muted-foreground">
                  <span className="mt-1 flex-shrink-0">
                    <CheckCircle2
                      className="h-4 w-4 text-primary opacity-60"
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
