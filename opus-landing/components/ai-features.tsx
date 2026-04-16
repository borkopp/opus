"use client";
import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Bot, CalendarSync } from "lucide-react";

export function AiFeatures() {
  return (
    <Container className="px-4 py-10 md:py-20 lg:py-32">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <Heading as="h2" className="mb-4">
          Моќна Вештачка Интелигенција
        </Heading>
        <Subheading className="text-balance">
          Дозволете технологијата да го оптимизира вашиот распоред и да се грижи за вашите клиенти 24 часа.
        </Subheading>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        <AiFeatureCard
          icon={<Bot className="size-8 text-neutral-800 dark:text-neutral-200" />}
          title="AI Дигитален Рецепционер"
          description="Вашиот нов вработен кој никогаш не спие. Нашиот напреден AI систем автоматски комуницира со клиентите преку вашиот профил, одговара на нивните прашања за услугите и прифаќа резервации додека вие работите или одмарате."
        />
        <AiFeatureCard
          icon={<CalendarSync className="size-8 text-neutral-800 dark:text-neutral-200" />}
          title="AI Оптимизатор на Термини"
          description="Максимизирајте ја вашата заработка со нашата паметна логика за термини. Оптимизаторот интелигентно ги нуди слободните часови на начин кој превенира создавање на неискористливи празнини помеѓу две закажувања."
        />
      </div>
    </Container>
  );
}

function AiFeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col items-start gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 shadow-black/5 ring-black/10 transition-all hover:shadow-md dark:bg-neutral-900 dark:shadow-white/5 dark:ring-white/10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
        {icon}
      </div>
      <div>
        <h3 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}
