"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { MapPin, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ReservationFrame } from "./ReservationFrame";
import type { ReservationVenue } from "./types";

export function ReservationWebsite({
  venue,
  preview = false,
}: {
  venue: ReservationVenue;
  preview?: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  return (
    <ReservationFrame name={venue.name}>
      <section className="flex flex-col items-start gap-6 py-8 sm:py-16">
        <p className="text-sm text-muted-foreground">
          {t(
            "A table for your next get-together",
            "Маса за вашата следна средба",
            "Një tavolinë për takimin tuaj të ardhshëm",
          )}
        </p>
        <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold tracking-tight sm:text-6xl">
          {venue.name}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground [overflow-wrap:anywhere]">
          {venue.bio ||
            (venue.acceptingReservations || preview
              ? t(
                  "Choose your party size and a time that works for you. Your reservation is confirmed online.",
                  "Изберете број на гости и термин што ви одговара. Резервацијата се потврдува онлајн.",
                  "Zgjidhni numrin e mysafirëve dhe një orar që ju përshtatet. Rezervimi konfirmohet online.",
                )
              : t(
                  "Contact us to arrange your next visit.",
                  "Контактирајте нè за да ја договорите следната посета.",
                  "Na kontaktoni për të organizuar vizitën tuaj të ardhshme.",
                ))}
        </p>
        {preview ? (
          <p role="status">
            {t(
              "Website preview · Publish when your venue is ready.",
              "Преглед на веб-страницата · Објавете кога локалот ќе биде подготвен.",
              "Parapamje e faqes · Publikojeni kur lokali të jetë gati.",
            )}
          </p>
        ) : venue.acceptingReservations ? (
          <Button size="lg" asChild>
            <Link href="/reserve">
              {t(
                "Reserve a table",
                "Резервирајте маса",
                "Rezervoni një tavolinë",
              )}
            </Link>
          </Button>
        ) : (
          <p role="status">
            {t(
              "Online reservations are currently paused. Contact the venue to arrange a visit.",
              "Онлајн резервациите моментално се паузирани. Контактирајте со локалот за да договорите посета.",
              "Rezervimet online janë pezulluar për momentin. Kontaktoni lokalin për të organizuar një vizitë.",
            )}
          </p>
        )}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Service hours", "Работно време", "Orari i shërbimit")}
          </CardTitle>
          <CardDescription>
            {t(
              "Available times depend on your party size and date.",
              "Слободните термини зависат од бројот на гости и датумот.",
              "Oraret e lira varen nga numri i mysafirëve dhe data.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {venue.settings.servicePeriods.map((period, index) => (
            <div key={index} className="flex flex-col gap-1 text-sm">
              <p className="font-medium [overflow-wrap:anywhere]">
                {period.name}
              </p>
              <p>
                {period.daysOfWeek
                  .map((day) =>
                    new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(2020, 0, 5 + day))),
                  )
                  .join(", ")}
              </p>
              <p>
                {period.startTime}–{period.endTime}
                {period.endDayOffset === 1
                  ? t(" (next day)", " (следниот ден)", " (ditën tjetër)")
                  : ""}
              </p>
              {period.lastSeatingTime && (
                <p className="text-muted-foreground">
                  {t(
                    "Last arrival",
                    "Последно пристигнување",
                    "Mbërritja e fundit",
                  )}
                  : {period.lastSeatingTime}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                "Plan your visit",
                "Испланирајте ја посетата",
                "Planifikoni vizitën tuaj",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "Reservation details",
                "Детали за резервацијата",
                "Detajet e rezervimit",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-start gap-3">
              <Users className="size-5 shrink-0" aria-hidden="true" />
              <span>
                {t("Parties of ", "Број на гости: ", "Numri i mysafirëve: ")}
                {venue.settings.minPartySize}–{venue.settings.maxPartySize}
                {t(". Dining time:", ". Времетраење:", ". Kohëzgjatja:")}{" "}
                {venue.settings.defaultDurationMins}
                {t(" minutes.", " минути.", " minuta.")}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "Change or cancel online up to",
                "Изменете или откажете онлајн до",
                "Ndryshoni ose anuloni online deri në",
              )}{" "}
              {venue.settings.cancellationWindowHours}
              {t(
                " hours before your reservation. For later changes, contact the venue.",
                " часа пред резервацијата. За подоцнежни измени, контактирајте со локалот.",
                " orë para rezervimit. Për ndryshime më të vona, kontaktoni lokalin.",
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Find us", "Најдете нè", "Na gjeni")}</CardTitle>
            <CardDescription>
              {t(
                "Venue contact details",
                "Контакт со локалот",
                "Kontakti i lokalit",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-start gap-3">
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              <span>
                {[venue.address, venue.city].filter(Boolean).join(", ")}
              </span>
            </p>
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="flex items-center gap-3 underline underline-offset-4"
              >
                <Phone className="size-5" aria-hidden="true" />
                {venue.phone}
              </a>
            )}
            <p className="text-sm text-muted-foreground">
              {t(
                "All reservation times use ",
                "Сите термини се во временската зона ",
                "Të gjitha oraret përdorin zonën kohore ",
              )}
              {venue.timezone}.
            </p>
          </CardContent>
        </Card>
      </div>
    </ReservationFrame>
  );
}
