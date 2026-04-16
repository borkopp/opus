import { cn } from "@/lib/utils";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import React from "react";
import { Container } from "./container";
import { GridLineHorizontal, GridLineVertical } from "./grid-lines";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Button } from "./button";

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  frequency: string;
  features: string[];
  additionalFeatures?: string[];
  featured?: boolean;
  buttonText: string;
};

const plans: Plan[] = [
  {
    id: "premium",
    name: "Опус Премиум",
    description: "Бесплатно првите 3 месеци, потоа само 20€ месечно. Откажете во секое време.",
    price: 20,
    currency: "EUR",
    frequency: "месец",
    features: [
      "Онлајн резервации 24/7",
      "Управување со тим и услуги",
      "AI Асистент & Автоматизација",
      "Напредни извештаи и аналитика",
      "Автоматски потсетници (SMS/Email)",
    ],
    additionalFeatures: [
      "Бесплатен домен",
      "Интеграција за онлајн плаќања",
      "Бесплатна техничка поддршка",
    ],
    featured: true,
    buttonText: "Започнете бесплатно",
  }
];

export function Pricing() {
  return (
    <Container as="section" className="flex w-full flex-col">
      <div className="relative mx-auto my-12 flex w-full max-w-7xl flex-1 flex-col px-4 py-0 sm:my-10 md:my-20 lg:px-4">
        <Heading
          as="h2"
          className="pt-4 text-center text-2xl font-medium tracking-tight text-neutral-800 md:text-4xl dark:text-neutral-100"
        >
          Едноставни цени,
          без <span className="text-brand-primary font-playfair italic">изненадувања</span>
        </Heading>
        <Subheading className="mx-auto mt-4 max-w-md text-center text-base text-neutral-600 dark:text-neutral-300">
          Започнете бесплатно без никаков ризик. Нема скриени трошоци.
        </Subheading>

        <div className="py-4 md:py-10">
          <PricingGrid />
        </div>
      </div>
    </Container>
  );
}

export function PricingGrid() {
  return (
    <div className="relative grid w-full grid-cols-1 gap-2 overflow-hidden p-4 sm:gap-3 md:grid-cols-1 lg:max-w-md lg:mx-auto">
      {plans.map((plan) => (
        <PricingCard plan={plan} key={plan.id} />
      ))}
    </div>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative rounded-sm bg-transparent p-1 sm:p-2 md:p-3 dark:bg-neutral-950",
        plan.featured &&
        "border border-transparent bg-white shadow ring shadow-black/10 ring-black/5 dark:bg-neutral-900",
      )}
    >
      {plan.featured && (
        <>
          <GridLineHorizontal className="-top-[2px]" offset="100px" />
          <GridLineHorizontal className="-bottom-[2px]" offset="100px" />
          <GridLineVertical className="-left-[2px]" offset="100px" />
          <GridLineVertical className="-right-[2px] left-auto" offset="100px" />
        </>
      )}
      <div className="flex h-full flex-col justify-start gap-1 p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-black sm:text-lg dark:text-white">
              {plan.name}
            </p>
          </div>
          {plan.featured && (
            <div className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
              Popular
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {plan.description}
        </p>
        <div className="my-6">
          <div className="flex items-end">
            <span className="text-3xl font-medium text-neutral-800 md:text-4xl dark:text-neutral-50">
              ${plan.price}
            </span>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            /{plan.frequency}
          </span>
        </div>
        <Button variant={plan.featured ? "default" : "outline"}>
          {plan.buttonText}
        </Button>
        <div className="mt-1">
          {plan.features.map((feature, idx) => (
            <FeatureItem key={idx}>{feature}</FeatureItem>
          ))}
        </div>
        {plan.additionalFeatures && plan.additionalFeatures.length > 0 && (
          <Divider />
        )}
        <div className="py-3">
          {plan.additionalFeatures?.map((feature, idx) => (
            <FeatureItem additional key={idx}>
              {feature}
            </FeatureItem>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  children,
  additional,
  className,
}: {
  children: React.ReactNode;
  additional?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("my-5 flex items-start justify-start gap-2", className)}>
      <div
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-700",
          additional && "bg-brand-primary",
        )}
      >
        <IconCheck className="h-3 w-3 stroke-[4px] text-neutral-300" />
      </div>
      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="h-px w-full bg-neutral-100 dark:bg-neutral-950" />
      <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800" />
      <div className="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-xl bg-white shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-800 dark:shadow-[0px_-1px_0px_0px_var(--neutral-700)]">
        <IconPlus className="size-3 stroke-[4px] text-black dark:text-neutral-300" />
      </div>
    </div>
  );
}
