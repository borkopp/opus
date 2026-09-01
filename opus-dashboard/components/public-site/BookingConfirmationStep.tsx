"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Download,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-price";
import {
  formatBookingDate,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { downloadIcsFile, getGoogleCalendarUrl } from "./calendar-export";
import type { PublicSite } from "./types";

interface BookingResult {
  bookingId: string;
  serviceName: string;
  staffName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
}

interface BookingConfirmationStepProps {
  site: PublicSite;
  result: BookingResult;
  customerEmail: string;
  onBookAnother: () => void;
}

export function BookingConfirmationStep({
  site,
  result,
  customerEmail,
  onBookAnother,
}: BookingConfirmationStepProps) {
  const location = [site.address, site.neighborhood, site.city]
    .filter(Boolean)
    .join(", ");
  const googleMapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${site.name}, ${location}`,
      )}`
    : null;
  const googleCalendarUrl = getGoogleCalendarUrl({
    title: `${result.serviceName} во ${site.name}`,
    description: `Резервација за ${result.serviceName} со ${result.staffName} во ${site.name}.`,
    location,
    startAt: result.startAt,
    endAt: result.endAt,
  });

  const handleDownloadCalendar = () => {
    downloadIcsFile({
      title: `${result.serviceName} - ${site.name}`,
      description: `Услуга: ${result.serviceName}\nСпецијалист: ${result.staffName}\nСтудио: ${site.name}\nЦена: ${formatPrice(result.priceMinorUnits, result.currency, site.bookingSettings.locale)}`,
      location,
      startAt: result.startAt,
      endAt: result.endAt,
      filename: `${site.slug}-termin.ics`,
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        <span className="micro-label">Потврдено</span>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Терминот е зачуван
        </h1>
        <p className="max-w-xl leading-7 text-muted-foreground">
          Терминот е додаден во календарот на {site.name}. Потврдата е завршена
          преку{" "}
          <span className="font-medium text-foreground">{customerEmail}</span>.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-s sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="micro-label text-muted-foreground">{site.name}</p>
          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
        </div>

        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Услуга</dt>
            <dd className="font-medium">{result.serviceName}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:text-right">
            <dt className="text-xs text-muted-foreground">Специјалист</dt>
            <dd className="font-medium">{result.staffName}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Датум</dt>
            <dd className="font-medium">{formatBookingDate(result.startAt)}</dd>
            <dd className="font-mono text-muted-foreground">
              {formatBookingTime(result.startAt)}–
              {formatBookingTime(result.endAt)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:text-right">
            <dt className="text-xs text-muted-foreground">Цена</dt>
            <dd className="font-mono font-medium">
              {formatPrice(
                result.priceMinorUnits,
                result.currency,
                site.bookingSettings.locale,
              )}
            </dd>
          </div>
        </dl>

        {googleMapsUrl && (
          <Button asChild variant="link" size="sm" className="mt-5 w-fit">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
              Отвори ја локацијата
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline">
          <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
            <CalendarPlus data-icon="inline-start" />
            Google Calendar
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadCalendar}
        >
          <Download data-icon="inline-start" />
          Преземи .ics
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild>
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Назад кон студиото
          </Link>
        </Button>
        <Button type="button" variant="ghost" onClick={onBookAnother}>
          <Plus data-icon="inline-start" />
          Резервирај друг термин
        </Button>
      </div>
    </section>
  );
}
