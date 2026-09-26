"use client";

import { useState } from "react";
import { CalendarDays, Mail, Phone, Scissors, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useDashboardAppearance } from "@/components/dashboard/DashboardAppearanceProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clientDate,
  clientInitials,
  type ClientAppointment,
  type ClientProfile,
} from "@/lib/clients";
import { formatPrice } from "@/lib/format-price";
import { ClientAmounts } from "./ClientList";

function Appointment({ appointment }: { appointment: ClientAppointment }) {
  const { t, locale } = useDashboardI18n();
  const labels = {
    confirmed: t("Confirmed", "Потврден"),
    checked_in: t("Checked in", "Пристигнат"),
    completed: t("Completed", "Завршен"),
    cancelled: t("Cancelled", "Откажан"),
    no_show: t("No-show", "Не се појавил"),
  };
  return (
    <li className="flex flex-col gap-3 border-b py-5 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {clientDate(appointment.startAt, locale, true)}
        </p>
        <Badge
          variant={appointment.status === "completed" ? "secondary" : "outline"}
          className="text-[10px]"
        >
          {labels[appointment.status]}
        </Badge>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">
            {appointment.services.join(" + ") || t("Appointment", "Термин")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {appointment.staffName ||
              t("Former team member", "Поранешен член на тимот")}{" "}
            · {Math.round((appointment.endAt - appointment.startAt) / 60_000)}{" "}
            {t("min", "мин")}
          </p>
        </div>
        <p className="shrink-0 text-sm tabular-nums">
          {formatPrice(
            appointment.priceMinorUnits,
            appointment.currency,
            locale,
            appointment.priceMinorUnits % 100 !== 0,
          )}
        </p>
      </div>
    </li>
  );
}

function ProfileContent({ profile }: { profile: ClientProfile }) {
  const { t, locale } = useDashboardI18n();
  const [visible, setVisible] = useState(20);
  const { client } = profile;
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="size-16 rounded-2xl">
          <AvatarImage src={client.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="rounded-2xl text-xl">
            {clientInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="text-2xl font-medium tracking-tight break-words">
            {client.name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {client.firstVisitAt
              ? t("First visit", "Прва посета") +
                " · " +
                clientDate(client.firstVisitAt, locale)
              : t("No completed visits yet", "Сè уште нема завршени посети")}
          </p>
        </div>
      </div>
      <dl className="grid gap-3 rounded-2xl border p-4 text-sm">
        <div className="flex min-w-0 items-start gap-3">
          <dt>
            <Mail
              className="mt-0.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span data-replay-public className="sr-only">
              {t("Email", "Е-пошта")}
            </span>
          </dt>
          <dd className="min-w-0 break-all">
            {client.email || t("No email provided", "Нема внесена е-пошта")}
          </dd>
        </div>
        <div className="flex items-start gap-3">
          <dt>
            <Phone
              className="mt-0.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span data-replay-public className="sr-only">
              {t("Phone", "Телефон")}
            </span>
          </dt>
          <dd>
            {client.phone || t("No phone provided", "Нема внесен телефон")}
          </dd>
        </div>
      </dl>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/60 p-4">
          <dt data-replay-public className="text-xs text-muted-foreground">
            {t("Total visits", "Вкупно посети")}
          </dt>
          <dd className="mt-2 text-3xl font-medium tabular-nums">
            {client.visits}
          </dd>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4">
          <dt data-replay-public className="text-xs text-muted-foreground">
            {t("Completed value", "Вредност на посетите")}
          </dt>
          <dd className="mt-3 text-lg font-medium tabular-nums">
            <ClientAmounts values={client.completedValue} />
          </dd>
        </div>
      </dl>
      <p data-replay-public className="-mt-3 text-xs text-muted-foreground">
        {t(
          "Value of completed appointments; not a payment balance.",
          "Вредност на завршени термини, без евиденција за наплата.",
        )}
      </p>
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt
            data-replay-public
            className="flex items-center gap-2 text-muted-foreground"
          >
            <CalendarDays className="size-4" />
            {t("Last visit", "Последна посета")}
          </dt>
          <dd className="text-right">
            {clientDate(client.lastVisitAt, locale)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt
            data-replay-public
            className="flex shrink-0 items-center gap-2 text-muted-foreground"
          >
            <Scissors className="size-4" />
            {t("Most booked", "Најчеста услуга")}
          </dt>
          <dd className="text-right">{profile.favouriteService || "—"}</dd>
        </div>
      </dl>
      {profile.upcoming.length > 0 && (
        <section className="rounded-2xl border px-4">
          <h3 data-replay-public className="pt-4 text-sm font-medium">
            {t("Upcoming appointments", "Следни термини")}
          </h3>
          <ul>
            {profile.upcoming.map((appointment) => (
              <Appointment key={appointment.id} appointment={appointment} />
            ))}
          </ul>
        </section>
      )}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 data-replay-public className="font-medium">
            {t("Appointment history", "Историја на термини")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {profile.cancelled}{" "}
            {profile.cancelled === 1
              ? t("cancelled", "откажан")
              : t("cancelled", "откажани")}{" "}
            · {profile.noShows} {t("no-shows", "недоаѓања")}
          </p>
        </div>
        {profile.history.length ? (
          <>
            <ul>
              {profile.history.slice(0, visible).map((appointment) => (
                <Appointment key={appointment.id} appointment={appointment} />
              ))}
            </ul>
            {visible < profile.history.length && (
              <Button
                data-replay-public
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setVisible((count) => count + 20)}
              >
                {t("Show earlier appointments", "Прикажи постари термини")}
              </Button>
            )}
          </>
        ) : (
          <p data-replay-public className="py-6 text-sm text-muted-foreground">
            {t("No past appointments yet.", "Сè уште нема претходни термини.")}
          </p>
        )}
      </section>
    </>
  );
}

export function ClientProfileSheet({
  open,
  profile,
  onOpenChange,
}: {
  open: boolean;
  profile: ClientProfile | null | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const theme = useDashboardAppearance();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-dashboard-theme={theme}
        className="dashboard-shell w-full gap-0 sm:max-w-xl data-[state=open]:duration-200 data-[state=closed]:duration-200"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-5 py-4 sm:px-7">
          <div>
            <SheetTitle data-replay-public>
              {t("Client profile", "Профил на клиент")}
            </SheetTitle>
            <SheetDescription data-replay-public>
              {t(
                "Contact details and appointment history",
                "Контакт и историја на термини",
              )}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("Close profile", "Затвори профил")}
            >
              <X />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-7">
          {profile === undefined ? (
            <div
              className="flex flex-col gap-5"
              role="status"
              aria-label={t("Loading client", "Се вчитува клиентот")}
            >
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : profile === null ? (
            <p data-replay-public>
              {t(
                "This client is no longer available.",
                "Овој клиент повеќе не е достапен.",
              )}
            </p>
          ) : (
            <ProfileContent key={profile.client.id} profile={profile} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
