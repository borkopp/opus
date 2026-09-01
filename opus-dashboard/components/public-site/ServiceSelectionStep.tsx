"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { BookingStepShell } from "./BookingStepShell";
import type { PublicSite } from "./types";

interface ServiceSelectionStepProps {
  site: PublicSite;
  selectedStaffId?: string | "any";
  selectedServiceId?: string;
  onSelectService: (serviceId: string) => void;
  onBack: () => void;
}

export function ServiceSelectionStep({
  site,
  selectedStaffId,
  selectedServiceId,
  onSelectService,
  onBack,
}: ServiceSelectionStepProps) {
  const selectedStaff =
    selectedStaffId && selectedStaffId !== "any"
      ? site.staff.find((member) => member._id === selectedStaffId)
      : null;
  const services = selectedStaff
    ? site.services.filter((service) =>
        (service.staffIds as string[]).includes(selectedStaff._id),
      )
    : site.services;

  return (
    <BookingStepShell
      title="Изберете услуга"
      description={
        selectedStaff
          ? `Прикажани се услугите што ги нуди ${selectedStaff.displayName}.`
          : "Започнете со услугата што сакате да ја резервирате."
      }
      backLabel={`Назад кон ${site.name}`}
      onBack={onBack}
    >
      {services.length > 0 ? (
        <div className="grid gap-3">
          {services.map((service) => {
            const isSelected = selectedServiceId === service._id;

            return (
              <button
                key={service._id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectService(service._id)}
                className={cn(
                  "group grid w-full gap-4 rounded-2xl border bg-card p-4 text-left shadow-s transition-[transform,box-shadow,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5 motion-reduce:transform-none",
                  isSelected
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
                    : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-m",
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  {service.photoUrl && (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <Image
                        src={service.photoUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="font-display text-lg font-semibold">
                      {service.name}
                    </h2>
                    {(service.consumerDescription || service.categoryName) && (
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {service.consumerDescription || service.categoryName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <span className="text-sm text-muted-foreground">
                    {service.durationMins} мин
                  </span>
                  <span className="font-mono text-sm font-medium">
                    {formatPrice(
                      service.priceMinorUnits,
                      service.currency,
                      site.bookingSettings.locale,
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground",
                    )}
                  >
                    {isSelected ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Нема достапни услуги</EmptyTitle>
            <EmptyDescription>
              Вратете се назад и изберете друг специјалист.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </BookingStepShell>
  );
}
