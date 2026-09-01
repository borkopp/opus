"use client";

import { ArrowRight, Check, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BookingStepShell } from "./BookingStepShell";
import type { PublicSite } from "./types";

interface StaffSelectionStepProps {
  site: PublicSite;
  selectedServiceId: string;
  selectedStaffId?: string | "any";
  onSelectStaff: (staffId: string | "any") => void;
  onBack: () => void;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function StaffSelectionStep({
  site,
  selectedServiceId,
  selectedStaffId,
  onSelectStaff,
  onBack,
}: StaffSelectionStepProps) {
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const eligibleStaff = site.staff.filter((member) =>
    (service?.staffIds as string[] | undefined)?.includes(member._id),
  );

  return (
    <BookingStepShell
      title="Изберете специјалист"
      description="Изберете член од тимот или оставете студиото да го додели првиот достапен."
      backLabel="Назад кон услуги"
      onBack={onBack}
    >
      <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary px-4 py-3 text-sm">
        <span className="text-muted-foreground">Избрана услуга</span>
        <span className="font-medium text-right">{service?.name}</span>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          aria-pressed={selectedStaffId === "any"}
          onClick={() => onSelectStaff("any")}
          className={cn(
            "group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-s transition-[transform,box-shadow,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary sm:p-5 motion-reduce:transform-none",
            selectedStaffId === "any"
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
              : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-m",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <UsersRound className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-semibold">
              Без претпочитан специјалист
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Ќе биде доделен достапен член од тимот за избраниот термин.
            </span>
          </span>
          {selectedStaffId === "any" ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-4" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          )}
        </button>

        {eligibleStaff.map((member) => {
          const isSelected = selectedStaffId === member._id;

          return (
            <button
              key={member._id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectStaff(member._id)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-s transition-[transform,box-shadow,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary sm:p-5 motion-reduce:transform-none",
                isSelected
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
                  : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-m",
              )}
            >
              <Avatar size="lg" aria-hidden="true">
                {member.avatarUrl && (
                  <AvatarImage src={member.avatarUrl} alt="" />
                )}
                <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold">
                  {member.displayName}
                </span>
                {member.specialties.length > 0 && (
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {member.specialties.join(" · ")}
                  </span>
                )}
              </span>
              {isSelected ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </span>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </BookingStepShell>
  );
}
