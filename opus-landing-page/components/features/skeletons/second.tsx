import { cn } from "@/lib/utils";
import {
  IconCalendarEvent,
  IconCheck,
  IconLoader2,
  IconRipple,
  IconX,
} from "@tabler/icons-react";
import React from "react";

export const SkeletonTwo = () => {
  return (
    <div
      style={{
        transform: "rotateY(20deg) rotateX(20deg) rotateZ(-20deg)",
      }}
      className={cn(
        "max-w-[85%] group h-full my-auto bg-neutral-100 dark:bg-neutral-900 mx-auto w-full p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 shadow-2xl flex flex-col mask-radial-from-50% mask-b-from-50%",
        "translate-x-10",
        "[--pattern-fg:var(--color-neutral-950)]/5  dark:[--pattern-fg:var(--color-white)]/10"
      )}
    >
      <div className="flex gap-3 items-center">
        <IconCalendarEvent className="size-4 text-blue-500" />
        <p className="text-sm font-normal text-black dark:text-white">
          Today's Appointments
        </p>
      </div>
      <div className="relative  flex-1 bg-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 mt-4 border border-neutral-200 rounded-2xl">
        <Pattern />
        <div className="absolute rounded-2xl translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:-translate-y-0 transition-all duration-300 inset-0 bg-white dark:bg-neutral-900 h-full w-full">
          <Row
            icon={<IconCheck className="size-3 text-white" />}
            text="Completed - Sarah M."
            time="09:00 AM"
          />
          <GradientHr />
          <Row
            icon={<IconCheck className="size-3 text-white" />}
            text="Completed - John T."
            time="10:15 AM"
          />
          <GradientHr />

          <Row
            icon={<IconX className="size-3 text-white" />}
            text="No Show - Emma K."
            time="11:30 AM"
            variant="danger"
          />
          <GradientHr />

          <Row
            icon={<IconCheck className="size-3 text-white" />}
            text="Completed - Lisa P."
            time="01:00 PM"
          />
          <GradientHr />

          <Row
            icon={<IconLoader2 className="size-3 text-white animate-spin" />}
            text="In Progress - Mark R."
            time="02:30 PM"
            variant="warning"
          />
        </div>
      </div>
    </div>
  );
};

const GradientHr = () => {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent"></div>
  );
};

const Row = ({
  icon,
  text,
  time,
  variant = "success",
}: {
  icon: React.ReactNode;
  text: string;
  time: string;
  variant?: "success" | "warning" | "danger";
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-4 flex items-center justify-center rounded-full",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-yellow-500",
            variant === "danger" && "bg-red-500"
          )}
        >
          {icon}
        </div>
        <p className="text-neutral-500 font-medium text-xs md:text-sm">
          {text}
        </p>
      </div>

      <div className="flex items-center gap-1 text-neutral-400">
        <IconRipple className="size-3" />
        <p className="text-[10px] font-bold">{time}</p>
      </div>
    </div>
  );
};

const Pattern = () => {
  return (
    <div className="absolute inset-0 bg-[image:repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed"></div>
  );
};
