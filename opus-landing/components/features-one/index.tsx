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
import { CalendarCheck, MailCheck, Smartphone } from "lucide-react";
import { useI18n } from "../i18n-provider";

export function FeaturesOne() {
  const { messages } = useI18n();
  const copy = messages.featuresOne;

  return (
    <Container as="section" id="product" className="py-10 md:py-20 lg:py-32">
      <Heading>
        {copy.heading}{" "}
        <span className="text-brand-primary font-lora italic">
          {copy.headingAccent}
        </span>
      </Heading>
      <Subheading className="mt-2">
        {copy.description}
      </Subheading>
      <div className="mx-auto mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:grid-rows-2">
        <Card className="md:row-span-2">
          <CardContent className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{copy.cards.calendar.title}</CardTitle>
              <CardDescription>
                {copy.cards.calendar.description}
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
              <CardTitle>{copy.cards.website.title}</CardTitle>
              <CardDescription>
                {copy.cards.website.description}
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
              <CardTitle>{copy.cards.ai.title}</CardTitle>
              <CardDescription>
                {copy.cards.ai.description}
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
              <CardTitle>{copy.cards.operations.title}</CardTitle>
              <CardDescription>
                {copy.cards.operations.description}
              </CardDescription>
            </CardHeader>
            <CardSkeleton className="-mt-4 mt-auto flex flex-1 items-center justify-center">
              <TeamServiceSkeleton />
            </CardSkeleton>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-4 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3">
        <FeatureCard
          icon={
            <CalendarCheck className="group-hover:text-brand-primary size-5 transition-colors" />
          }
          title={copy.highlights.calendar.title}
          description={copy.highlights.calendar.description}
        />
        <FeatureCard
          icon={
            <MailCheck className="group-hover:text-brand-primary size-5 transition-colors" />
          }
          title={copy.highlights.email.title}
          description={copy.highlights.email.description}
        />
        <FeatureCard
          icon={
            <Smartphone className="group-hover:text-brand-primary size-5 transition-colors" />
          }
          title={copy.highlights.guest.title}
          description={copy.highlights.guest.description}
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
