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
      <Heading>Алатки кои навистина ги користите</Heading>
      <Subheading className="mt-2">
        Поставете ги услугите, тимот и работното време, објавете ја вашата
        веб-страница и управувајте со секој термин од еден календар.
      </Subheading>
      <div className="mx-auto mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Резервации без конфузија</CardTitle>
              <CardDescription>
                Еден поглед на денот, неделата и персоналот, со заштита од
                двојно резервирање на истиот термин.
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
                Клиентите избираат услуга, член од тимот и слободен термин без
                да отвораат профил.
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
                Јасно поставете што нудите, колку трае, колку чини и кој член од
                тимот ја извршува услугата.
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
                Потврдете пристигнување, завршете, презакажете, откажете или
                означете недоаѓање од деталите за терминот.
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
          icon={<CalendarCheck className="group-hover:text-primary size-5" />}
          title="Календар за секојдневна работа"
          description="Прегледувајте ги термините по датум и член од тимот, со јасни состојби за секоја посета."
        />
        <FeatureCard
          icon={<Scissors className="group-hover:text-primary size-5" />}
          title="Поставување за студија за убавина"
          description="Внесете локација, услуги, цени, тим и работно време преку воден почетен процес."
        />
        <FeatureCard
          icon={<Link2 className="group-hover:text-primary size-5" />}
          title="Ваша веб-страница"
          description="Со едно објавување добивате адреса како vashe-studio.opus.mk, од која клиентите резервираат директно."
        />
      </div>
    </Container>
  );
}

function BookingLinkPreview() {
  return (
    <div className="border-border bg-muted/40 w-full rounded-lg border p-4">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Ваш линк
      </p>
      <div className="border-border bg-card mt-3 flex items-center gap-2 rounded-md border px-3 py-2">
        <Link2 className="text-primary size-4" />
        <span className="text-foreground truncate text-xs">
          vashe-studio.opus.mk
        </span>
      </div>
      <div className="bg-primary text-primary-foreground mt-3 rounded-md px-3 py-2 text-center text-xs font-semibold">
        Резервирај термин
      </div>
    </div>
  );
}

function BookingStatusPreview() {
  return (
    <div className="border-border bg-muted/40 w-full rounded-lg border p-4">
      <p className="text-foreground text-sm font-semibold">Ана · Маникир</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Денес, 14:30 · 45 мин.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="bg-success/10 text-success rounded-md px-2 py-2 text-center text-[10px] font-semibold">
          Пристигнат
        </span>
        <span className="bg-muted text-muted-foreground rounded-md px-2 py-2 text-center text-[10px] font-semibold">
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
        "border-border bg-card rounded-lg border shadow-sm",
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
    <h3 className={cn("text-foreground text-sm font-semibold", className)}>
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
    <p className={cn("text-muted-foreground text-sm text-balance", className)}>
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
    <div className="group border-border bg-card rounded-lg border p-6">
      {icon}
      <h3 className="text-foreground mt-4 text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm text-balance">
        {description}
      </p>
    </div>
  );
}
