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
import { clientAreaUrl } from "@/lib/client-account";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { usePublicBookingI18n } from "./PublicBookingI18n";
import type { PublicSite } from "./types";

interface BookingResult {
  claimToken?: string;
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
  accountBooking?: boolean;
  result: BookingResult;
  customerEmail: string;
  onBookAnother: () => void;
}

export function BookingConfirmationStep({
  site,
  accountBooking = false,
  result,
  customerEmail,
  onBookAnother,
}: BookingConfirmationStepProps) {
  const { t, text, locale } = usePublicBookingI18n();
  const location = [site.address, site.neighborhood, site.city]
    .filter(Boolean)
    .join(", ");
  const googleMapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${site.name}, ${location}`,
      )}`
    : null;
  const googleCalendarUrl = getGoogleCalendarUrl({
    title: text("{v0} во {v1}", { v0: result.serviceName, v1: site.name }),
    description: text("Резервација за {v0} со {v1} во {v2}.", {
      v0: result.serviceName,
      v1: result.staffName,
      v2: site.name,
    }),
    location,
    startAt: result.startAt,
    endAt: result.endAt,
  });

  const handleDownloadCalendar = () => {
    downloadIcsFile({
      title: `${result.serviceName} - ${site.name}`,
      description: text(
        "Услуга: {v0}\nСпецијалист: {v1}\nСтудио: {v2}\nЦена: {v3}",
        {
          v0: result.serviceName,
          v1: result.staffName,
          v2: site.name,
          v3: formatPrice(
            result.priceMinorUnits,
            result.currency,
            site.bookingSettings.locale,
          ),
        },
      ),
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
        <span className="micro-label">{text("Потврдено")}</span>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {text("Терминот е зачуван")}
        </h1>
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
            <dt className="text-xs text-muted-foreground">{text("Услуга")}</dt>
            <dd className="font-medium">{result.serviceName}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:text-right">
            <dt className="text-xs text-muted-foreground">
              {text("Специјалист")}
            </dt>
            <dd className="font-medium">{result.staffName}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">{text("Датум")}</dt>
            <dd className="font-medium">
              {formatBookingDate(result.startAt, locale)}
            </dd>
            <dd className="font-mono text-muted-foreground">
              {formatBookingTime(result.startAt)}–
              {formatBookingTime(result.endAt)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:text-right">
            <dt className="text-xs text-muted-foreground">{text("Цена")}</dt>
            <dd className="font-mono font-medium">
              {formatPrice(
                result.priceMinorUnits,
                result.currency,
                site.bookingSettings.locale,
              )}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">
              {text("Потврдено преку е-пошта")}
            </dt>
            <dd className="break-all font-medium">{customerEmail}</dd>
          </div>
        </dl>

        {googleMapsUrl && (
          <Button asChild variant="link" size="sm" className="mt-5 w-fit">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
              {text("Отвори ја локацијата")}
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        )}
      </div>

      {site.bookingSettings.clientAccountsEnabled && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {result.claimToken
              ? t(
                  "Save this appointment to your OPUS account for easier bookings next time. Guest booking stays available.",
                  "Зачувајте го терминот во OPUS сметка за полесно следно закажување. Може и понатаму да резервирате како гостин.",
                  "Ruajeni këtë termin në llogarinë tuaj OPUS për rezervime më të lehta herën tjetër. Rezervimi si mysafir mbetet i disponueshëm.",
                )
              : t(
                  "This appointment is saved to your OPUS account.",
                  "Терминот е зачуван во вашата OPUS сметка.",
                  "Ky termin është ruajtur në llogarinë tuaj OPUS.",
                )}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const path = result.claimToken
                ? `/account?claim=${encodeURIComponent(result.bookingId)}#${new URLSearchParams({ proof: result.claimToken })}`
                : "/account";
              window.location.assign(
                clientAreaUrl(path, window.location.origin),
              );
            }}
          >
            {t(
              "Open my OPUS account",
              "Отвори ја мојата OPUS сметка",
              "Hap llogarinë time OPUS",
            )}
          </Button>
        </div>
      )}
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
          {text("Преземи .ics")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild>
          <Link
            href={
              accountBooking
                ? `${tenantSiteUrl(
                    site.slug,
                    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk",
                  )}?lang=${locale}`
                : `/?lang=${locale}`
            }
          >
            <ArrowLeft data-icon="inline-start" />
            {text("Назад кон студиото")}
          </Link>
        </Button>
        <Button type="button" variant="ghost" onClick={onBookAnother}>
          <Plus data-icon="inline-start" />
          {text("Резервирај друг термин")}
        </Button>
      </div>
    </section>
  );
}
