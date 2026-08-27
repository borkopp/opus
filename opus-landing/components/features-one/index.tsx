"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { TeamServiceSkeleton } from "./keyboard-skeleton";
import { CalendarSkeleton } from "./login-skeleton";
import { Heading } from "../heading";
import { Subheading } from "../subheading";
import { Container } from "../container";
import { CalendarCheck, Link2, Scissors } from "lucide-react";

export function FeaturesOne() {
  return (
    <Container as="section" id="product" className="py-10 md:py-20 lg:py-32">
      <Heading>Алатки кои <span className="text-brand-primary font-playfair italic">навистина</span> ги користите</Heading>
      <Subheading className="mt-2">
        Поставете ги услугите, тимот и работното време, споделете јавен линк и управувајте со секој термин од еден календар.
      </Subheading>
      <div className="mx-auto mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Резервации без конфузија</CardTitle>
              <CardDescription>
                Еден поглед на денот, неделата и персоналот, со заштита од двојно резервирање на истиот термин.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center overflow-hidden pt-4">
              <CalendarSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Јавен линк за резервации</CardTitle>
              <CardDescription>
                Клиентите избираат услуга, член од тимот и слободен термин без да отвораат профил.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center p-6 pt-2">
              <BookingLinkPreview />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Услуги, цени и тим</CardTitle>
              <CardDescription>
                Јасно поставете што нудите, колку трае, колку чини и кој член од тимот ја извршува услугата.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center overflow-hidden pt-4">
              <TeamServiceSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Статуси на термини</CardTitle>
              <CardDescription>
                Потврдете пристигнување, завршете, презакажете, откажете или означете недоаѓање од деталите за терминот.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center p-6 pt-2">
              <BookingStatusPreview />
            </CardSkeleton>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-4 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3">
        <FeatureCard
          icon={<CalendarCheck className="group-hover:text-brand-primary size-5" />}
          title="Календар за секојдневна работа"
          description="Прегледувајте ги термините по датум и член од тимот, со јасни состојби за секоја посета."
        />
        <FeatureCard
          icon={<Scissors className="group-hover:text-brand-primary size-5" />}
          title="Поставување за студија за убавина"
          description="Внесете локација, услуги, цени, тим и работно време преку воден почетен процес."
        />
        <FeatureCard
          icon={<Link2 className="group-hover:text-brand-primary size-5" />}
          title="Marketplace профил"
          description="Објавете го студиото на opus.mk и дозволете им на гостите да резервираат директно од јавниот профил."
        />
      </div>
    </Container>
  );
}

function BookingLinkPreview() {
  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Ваш линк
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <Link2 className="size-4 text-brand-primary" />
        <span className="truncate text-xs text-neutral-600 dark:text-neutral-300">
          opus.mk/vashe-studio
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-brand-primary px-3 py-2 text-center text-xs font-semibold text-white">
        Резервирај термин
      </div>
    </div>
  );
}

function BookingStatusPreview() {
  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        Ана · Маникир
      </p>
      <p className="mt-1 text-xs text-neutral-500">Денес, 14:30 · 45 мин.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="rounded-lg bg-emerald-100 px-2 py-2 text-center text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Пристигнат
        </span>
        <span className="rounded-lg bg-neutral-200 px-2 py-2 text-center text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          Презакажи
        </span>
      </div>
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-900 dark:shadow-white/5 dark:ring-white/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("", className)}>{children}</div>;
}

function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-6", className)}>{children}</div>
  );
}

function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-neutral-900 dark:text-white",
        className,
      )}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm text-balance text-neutral-600 dark:text-neutral-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

function CardSkeleton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-white p-6 dark:bg-neutral-900">
      {icon}
      <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-balance text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
