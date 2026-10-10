"use client";

import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format-price";
import {
  formatBookingDate,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { usePublicBookingI18n } from "./PublicBookingI18n";

export function BookingSummary({
  serviceName,
  durationMins,
  priceMinorUnits,
  currency,
  staffName,
  startAt,
  endAt,
}: {
  serviceName: string;
  durationMins: number;
  priceMinorUnits: number;
  currency: string;
  staffName?: string;
  startAt?: number | null;
  endAt?: number;
}) {
  const { text, locale } = usePublicBookingI18n();
  return (
    <Card className="gap-3 rounded-2xl" data-booking-selection-summary>
      <CardHeader className="hidden pb-0 lg:grid">
        <CardTitle>{text("Вашиот термин")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 lg:pt-1">
        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 lg:grid-cols-1 lg:gap-y-4">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="sr-only">{text("Услуга")}</dt>
            <dd className="text-pretty font-medium leading-6 [overflow-wrap:anywhere]">
              {serviceName}
            </dd>
            <dd className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
              {durationMins} {text("мин")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="sr-only lg:not-sr-only lg:text-xs lg:text-muted-foreground">
              {text("Цена")}
            </dt>
            <dd className="font-medium tabular-nums">
              {formatPrice(priceMinorUnits, currency, locale)}
            </dd>
          </div>
          {staffName && (
            <div className="col-span-full flex min-w-0 items-start gap-2.5 text-sm">
              <dt>
                <UserRound
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">{text("Специјалист")}</span>
              </dt>
              <dd className="min-w-0 text-pretty leading-5 [overflow-wrap:anywhere]">
                {staffName}
              </dd>
            </div>
          )}
          {startAt != null && (
            <div className="col-span-full flex min-w-0 items-start gap-2.5 text-sm">
              <dt>
                <CalendarDays
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">{text("Датум и време")}</span>
              </dt>
              <dd className="flex min-w-0 flex-col gap-1">
                <span className="text-pretty leading-5">
                  {formatBookingDate(startAt, locale)}
                </span>
                <span className="font-medium tabular-nums">
                  {formatBookingTime(startAt)}–
                  {formatBookingTime(endAt ?? startAt + durationMins * 60_000)}
                </span>
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
