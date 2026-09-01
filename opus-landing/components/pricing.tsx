"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Container } from "./container";
import { Button } from "@/components/ui/button";
import * as PricingCardUI from "@/components/ui/pricing-card";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import Link from "next/link";

const plans = [
  {
    id: "free",
    title: "Бесплатен",
    badge: "За почеток",
    description:
      "Идеално за индивидуални мајстори и мали студија кои сакаат брзо и лесно да започнат со онлајн закажување.",
    price: "0",
    period: "/ засекогаш",
    popular: false,
    features: [
      "Личен веб-сајт за закажување ({studio}.opus.mk)",
      "До 50 резервации месечно",
      "1 корисник (сопственик)",
      "Интерактивен календар на термини",
      "Каталог на услуги и ценовник",
      "Мобилно закажување без регистрација за гости",
    ],
    buttonText: "Започнете бесплатно",
    buttonHref: "https://studio.opus.mk",
  },
  {
    id: "pro",
    title: "OPUS Про",
    badge: "Најпопуларно",
    description:
      "Бесплатно првите 3 месеци, потоа само 20€ месечно. За студија со тим кои сакаат неограничени термини и целосна организација.",
    price: "20",
    period: "/ месечно",
    priceComparison: "≈ 2-3 пропуштени резервации",
    popular: true,
    features: [
      "Сè од Бесплатниот план",
      "Неограничен број на резервации",
      "Неограничен тим и вработени",
      "Индивидуални смени, паузи и одмори",
      "Заштита од преклопување на термини",
      "Приоритетна техничка поддршка",
    ],
    buttonText: "Пробајте 3 месеци бесплатно",
    buttonHref: "https://studio.opus.mk",
  },
];

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
          "pointer-events-none absolute top-0 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full z-0",
          "bg-[radial-gradient(circle_at_center,rgba(206,93,69,0.08),transparent_70%)]",
          "blur-[80px]",
        )}
      />

      <div className="relative z-10 mx-auto mb-12 md:mb-16 flex flex-col items-center">
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

      <div
        ref={containerRef}
        className="relative z-10 mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 p-2 sm:p-4 items-stretch"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full"
          >
            <PricingCardUI.Card
              className={cn(
                "w-full max-w-none flex flex-col justify-between rounded-2xl p-2 transition-all duration-300",
                plan.popular
                  ? "border-brand-primary/40 dark:border-brand-primary/50 shadow-2xl bg-white/95 dark:bg-neutral-900/90 ring-1 ring-brand-primary/30"
                  : "border-neutral-200/80 dark:border-neutral-800/80 shadow-xl bg-white/80 dark:bg-neutral-900/70",
              )}
            >
              <PricingCardUI.Header className={cn(
                "rounded-xl p-5 sm:p-6",
                plan.popular ? "bg-brand-primary/[0.03] dark:bg-brand-primary/[0.05]" : "bg-neutral-50/80 dark:bg-neutral-800/40"
              )}>
                <PricingCardUI.Plan className="mb-6 flex items-center justify-between">
                  <PricingCardUI.PlanName>
                    <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {plan.title}
                    </span>
                  </PricingCardUI.PlanName>
                  <PricingCardUI.Badge
                    className={cn(
                      "font-semibold text-xs px-2.5 py-0.5",
                      plan.popular
                        ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-bold"
                        : "bg-neutral-200/60 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300",
                    )}
                  >
                    {plan.badge}
                  </PricingCardUI.Badge>
                </PricingCardUI.Plan>

                <PricingCardUI.Price className="mb-3 flex items-baseline gap-1">
                  <PricingCardUI.MainPrice className="text-4xl font-extrabold text-neutral-900 dark:text-white">
                    {plan.price}€
                  </PricingCardUI.MainPrice>
                  <PricingCardUI.Period className="text-neutral-500 font-medium text-sm">
                    {plan.period}
                  </PricingCardUI.Period>
                  {plan.priceComparison && (
                    <div className="ml-auto text-xs font-medium text-neutral-400 dark:text-neutral-500 self-center">
                      {plan.priceComparison}
                    </div>
                  )}
                </PricingCardUI.Price>

                <PricingCardUI.Description className="mb-6 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 min-h-[3rem]">
                  {plan.description}
                </PricingCardUI.Description>

                <Link href={plan.buttonHref} className="block w-full">
                  <Button
                    className={cn(
                      "w-full font-bold py-6 text-sm sm:text-base rounded-xl transition-all active:scale-[0.98]",
                      plan.popular
                        ? "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-[0_10px_30px_rgba(206,93,69,0.25)]"
                        : "border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 shadow-xs",
                    )}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {plan.popular && <Sparkles className="size-4" />}
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
                      className="text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 shrink-0">
                        <CheckCircle2
                          className={cn(
                            "size-4",
                            plan.popular ? "text-brand-primary" : "text-emerald-500",
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
