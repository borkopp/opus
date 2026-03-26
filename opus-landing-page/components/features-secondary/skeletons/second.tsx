"use client";


import {
  CogIcon,
  ErrorIcon,
  FileIcon,
  HubspotIcon,
  SalesforceIcon,
  SheetsIcon,
  SlackIcon,
} from "@/icons";
import { cn } from "@/lib/utils";
import {
  IconBrandInstagram,
  IconBrandMeta,
  IconBrandSlack,
  IconCircleDashedCheck,
} from "@tabler/icons-react";
import { motion } from "motion/react";

export const SkeletonTwo = () => {
  return (
    <div
      className="flex-1 rounded-t-3xl gap-2 flex items-center justify-center  w-full h-full absolute inset-x-0 p-2"
      style={{
        transform: "rotateY(20deg) rotateX(20deg) rotateZ(-20deg)",
      }}
    >
      <Circle className="flex items-center justify-center border-neutral-200 dark:border-neutral-700 shadow-sm">
        <RevolvingCard className="bg-white dark:bg-neutral-800">
          <IconBrandSlack className="size-8" />
        </RevolvingCard>
        <RevolvingCard className="[--initial-position:80deg] [--translate-position:160px] [--orbit-duration:20s] bg-white dark:bg-neutral-800">
          <IconBrandMeta className="size-8 text-blue-500" />
        </RevolvingCard>
        <RevolvingCard className="[--initial-position:140deg] [--translate-position:180px] [--orbit-duration:15s] bg-white dark:bg-neutral-800">
          <IconBrandInstagram className="size-8 text-red-500" />
        </RevolvingCard>
        <RevolvingCard className="[--initial-position:240deg] [--translate-position:220px] [--orbit-duration:25s] bg-white dark:bg-neutral-800">
          <SheetsIcon className="size-8" />
        </RevolvingCard>

        <RevolvingCard className="[--initial-position:20deg] [--translate-position:250px] [--orbit-duration:30s] size-auto ring-0 shadow-none bg-transparent w-60">
          <SkeletonCard
            className="absolute bottom-0 left-12  max-w-[90%] z-30 bg-white dark:bg-neutral-800"
            icon={<IconCircleDashedCheck className="size-4" />}
            title="Campaign Planner"
            description="Creates clear, ready-to-use campaign briefs using product info."
          />
        </RevolvingCard>

        <RevolvingCard className="[--initial-position:60deg] [--translate-position:210px] [--orbit-duration:20s] size-auto ring-0 shadow-none bg-transparent w-60">
          <SkeletonCard
            className="absolute bottom-0 left-12  max-w-[90%] z-30 bg-white dark:bg-neutral-800"
            icon={<IconCircleDashedCheck className="size-4" />}
            title="Ready made solutions"
          />
        </RevolvingCard>
      </Circle>
      <Circle className="shadow border-neutral-100  dark:border-neutral-700 size-60 bg-neutral-100/80 z-[9] dark:bg-neutral-800/80 relative"></Circle>
      <Circle className="shadow border-neutral-100  dark:border-neutral-700 size-80 bg-neutral-100/60 z-[8] dark:bg-neutral-800/60"></Circle>
      <Circle className="shadow border-neutral-100  dark:border-neutral-700 size-100 bg-neutral-100/40 z-[7] dark:bg-neutral-800/40"></Circle>
      <Circle className="shadow border-neutral-100  dark:border-neutral-700 size-120 bg-neutral-100/20 z-[6] dark:bg-neutral-800/20"></Circle>
    </div>
  );
};

const SkeletonCard = ({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "max-w-[85%] h-fit my-auto bg-transparent mx-auto w-full p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl",
        className
      )}
    >
      <div className="flex gap-3 items-center">
        {icon}
        <p className="text-xs font-normal text-black dark:text-white">
          {title}
        </p>
      </div>
      {description && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-400 font-normal mt-3">
          {description}
        </p>
      )}
    </div>
  );
};

const RevolvingCard = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "size-10  flex absolute inset-0 m-auto items-center justify-center bg-white dark:bg-transparent  border border-transparent shadow-black/10 ring-1 ring-black/10 rounded-sm animate-orbit [--translate-position:120px] [--orbit-duration:10s]",
        className
      )}
    >
      {children}
    </div>
  );
};

const Circle = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "size-40 bg-white absolute inset-0 dark:bg-neutral-800  shrink-0 border z-[10] border-transparent rounded-full   m-auto",
        className
      )}
    >
      {children}
    </div>
  );
};
