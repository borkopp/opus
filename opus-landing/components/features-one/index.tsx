"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { WebsiteBookingSkeleton } from "./website-booking-skeleton";
import { TeamServiceSkeleton } from "./keyboard-skeleton";
import { CalendarSkeleton } from "./login-skeleton";
import { ChatConversation } from "./chat";
import { VerticalPulseLines } from "./vertical-pulse-lines";
import { FlippingImagesWithBar } from "./flipping-images";
import { Heading } from "../heading";
import { Subheading } from "../subheading";
import { Container } from "../container";
import { CalendarCheck, Clock, Smartphone } from "lucide-react";

export function FeaturesOne() {
  return (
    <Container as="section" id="product" className="py-10 md:py-20 lg:py-32">
      <Heading>Алатки кои <span className="text-brand-primary font-playfair italic">навистина</span> ги користите</Heading>
      <Subheading className="mt-2">
        Не уште еден CRM за кој ви треба обука. OPUS е направен за луѓе кои работат со раце и имаат 3 минути меѓу клиенти.
      </Subheading>
      <div className="mx-auto mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Резервации без конфузија</CardTitle>
              <CardDescription>
                Еден поглед на денот, неделата, персоналот. Без двојни резервации, без пропуштени термини.
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
              <CardTitle>Ваш личен веб-сајт за резервации</CardTitle>
              <CardDescription>
                Добијте сопствена веб-страница на ваш линк каде клиентите можат лесно да прегледуваат услуги и сами да резервираат термин.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center p-4 pt-0">
              <WebsiteBookingSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>AI асистент</CardTitle>
              <CardDescription>
                Одговара на клиенти, закажува, испраќа потсетници — автоматски, на македонски, 24/7.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 flex-col items-center justify-between gap-2 overflow-hidden pt-4">
              <ChatConversation className="min-h-0 shrink p-2 px-4" />
              <VerticalPulseLines className="h-24 shrink-0" />
              <div className="shrink-0 scale-75">
                <FlippingImagesWithBar />
              </div>
            </CardSkeleton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Управување со тим и услуги</CardTitle>
              <CardDescription>
                Едноставно организирајте ги услугите, цените и распоредот на вашите вработени.
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="mt-auto flex flex-1 items-center justify-center -mt-4">
              <TeamServiceSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-4 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3">
        <FeatureCard
          icon={<CalendarCheck className="group-hover:text-brand-primary size-5 transition-colors" />}
          title="Календар без преклопувања"
          description="Прегледен дневен и неделен распоред на целиот тим, со автоматска заштита од двојно резервирање на термини."
        />
        <FeatureCard
          icon={<Clock className="group-hover:text-brand-primary size-5 transition-colors" />}
          title="Флексибилно работно време"
          description="Лесно подесете индивидуални смени, слободни денови, паузи и исклучоци за секој член од вашиот тим."
        />
        <FeatureCard
          icon={<Smartphone className="group-hover:text-brand-primary size-5 transition-colors" />}
          title="Брзо закажување без регистрација"
          description="Клиентите го отвораат вашиот линк од Instagram или порака и закажуваат термин за помалку од една минута."
        />
      </div>
    </Container>
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
