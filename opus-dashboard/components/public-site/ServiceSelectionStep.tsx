"use client";

import Image from "next/image";
import { Clock3 } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatPrice } from "@/lib/format-price";
import { BookingChoiceCard } from "./BookingChoiceCard";
import { BookingStepShell } from "./BookingStepShell";
import { usePublicBookingI18n } from "./PublicBookingI18n";
import type { PublicSite } from "./types";

interface ServiceSelectionStepProps {
  site: PublicSite;
  selectedServiceId?: string;
  onSelectService: (serviceId: string) => void;
  onBack: () => void;
}

export function ServiceSelectionStep({
  site,
  selectedServiceId,
  onSelectService,
  onBack,
}: ServiceSelectionStepProps) {
  const { text, locale } = usePublicBookingI18n();
  return (
    <BookingStepShell
      title={text("Изберете услуга")}
      description={text(
        "Изберете ја услугата што сакате да ја резервирате. Потоа изберете специјалист и термин.",
      )}
      backLabel={text("Назад кон {v0}", { v0: site.name })}
      onBack={onBack}
    >
      {site.services.length > 0 ? (
        <div className="grid gap-3">
          {site.services.map((service) => (
            <BookingChoiceCard
              key={service._id}
              selected={selectedServiceId === service._id}
              onClick={() => onSelectService(service._id)}
            >
              <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                {service.photoUrl && (
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <Image
                      src={service.photoUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="56px"
                    />
                  </span>
                )}
                <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="text-base font-semibold leading-6 [overflow-wrap:anywhere]">
                      {service.name}
                    </h2>
                    {(service.consumerDescription || service.categoryName) && (
                      <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {service.consumerDescription || service.categoryName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
                    <span className="font-medium tabular-nums">
                      {formatPrice(
                        service.priceMinorUnits,
                        service.currency,
                        locale,
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock3
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      {service.durationMins} {text("мин")}
                    </span>
                  </div>
                </div>
              </div>
            </BookingChoiceCard>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{text("Нема достапни услуги")}</EmptyTitle>
            <EmptyDescription>
              {text("Контактирајте го студиото за да закажете термин.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </BookingStepShell>
  );
}
