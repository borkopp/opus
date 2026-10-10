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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/format-price";
import { downloadIcsFile, getGoogleCalendarUrl } from "./calendar-export";
import { clientAreaUrl } from "@/lib/client-account";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { BookingStepShell } from "./BookingStepShell";
import { BookingSummary } from "./BookingSummary";
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
  const { text, locale } = usePublicBookingI18n();
  const location = [site.address, site.neighborhood, site.city]
    .filter(Boolean)
    .join(", ");
  const studioHref = accountBooking
    ? `${tenantSiteUrl(site.slug, process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk")}?lang=${locale}`
    : `/?lang=${locale}`;
  const googleMapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${location}`)}`
    : null;
  const calendarDetails = {
    title: text("{v0} во {v1}", { v0: result.serviceName, v1: site.name }),
    description: text("Резервација за {v0} со {v1} во {v2}.", {
      v0: result.serviceName,
      v1: result.staffName,
      v2: site.name,
    }),
    location,
    startAt: result.startAt,
    endAt: result.endAt,
  };
  const handleDownloadCalendar = () =>
    downloadIcsFile({
      ...calendarDetails,
      description: text(
        "Услуга: {v0}\nСпецијалист: {v1}\nСтудио: {v2}\nЦена: {v3}",
        {
          v0: result.serviceName,
          v1: result.staffName,
          v2: site.name,
          v3: formatPrice(result.priceMinorUnits, result.currency, locale),
        },
      ),
      filename: `${site.slug}-termin.ics`,
    });

  return (
    <BookingStepShell
      title={text("Терминот е зачуван")}
      description={text(
        "Вашата резервација е потврдена. Деталите за терминот се подолу.",
      )}
      backLabel={text("Назад кон студиото")}
      onBack={() => window.location.assign(studioHref)}
      summary={
        <BookingSummary
          serviceName={result.serviceName}
          durationMins={Math.round((result.endAt - result.startAt) / 60_000)}
          staffName={result.staffName}
          priceMinorUnits={result.priceMinorUnits}
          currency={result.currency}
          startAt={result.startAt}
          endAt={result.endAt}
        />
      }
    >
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <CheckCircle2
                className="size-5 shrink-0 text-success"
                aria-hidden="true"
              />
              {text("Потврдено")}
            </h2>
          </CardTitle>
          <CardDescription>{site.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {location && (
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-6">{location}</p>
              {googleMapsUrl && (
                <Button asChild variant="outline" className="min-h-11 w-fit">
                  <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                    {text("Отвори ја локацијата")}
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              )}
            </div>
          )}
          <dl className="flex min-w-0 flex-col gap-1 text-sm">
            <dt className="text-muted-foreground">
              {text("Потврдено преку е-пошта")}
            </dt>
            <dd className="break-all font-medium">{customerEmail}</dd>
          </dl>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>
            <h2>{text("Додајте го во календар")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="min-h-11">
            <a
              href={getGoogleCalendarUrl(calendarDetails)}
              target="_blank"
              rel="noreferrer"
            >
              <CalendarPlus data-icon="inline-start" />
              Google Calendar
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCalendar}
            className="min-h-11"
          >
            <Download data-icon="inline-start" />
            {text("Преземи покана")}
          </Button>
        </CardContent>
      </Card>
      {site.bookingSettings.clientAccountsEnabled && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>
              <h2>{text("Вашата OPUS сметка")}</h2>
            </CardTitle>
            <CardDescription>
              {result.claimToken
                ? text(
                    "Зачувајте го терминот во OPUS сметка за полесно следно закажување.",
                  )
                : text("Терминот е зачуван во вашата OPUS сметка.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-fit"
              onClick={() => {
                const path = result.claimToken
                  ? `/account?claim=${encodeURIComponent(result.bookingId)}#${new URLSearchParams({ proof: result.claimToken })}`
                  : "/account";
                window.location.assign(
                  clientAreaUrl(path, window.location.origin),
                );
              }}
            >
              {text("Отвори ја мојата OPUS сметка")}
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild className="min-h-11">
          <Link href={studioHref}>
            <ArrowLeft data-icon="inline-start" />
            {text("Назад кон студиото")}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBookAnother}
          className="min-h-11"
        >
          <Plus data-icon="inline-start" />
          {text("Резервирај друг термин")}
        </Button>
      </div>
    </BookingStepShell>
  );
}
