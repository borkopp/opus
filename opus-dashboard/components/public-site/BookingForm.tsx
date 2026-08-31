"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPrice } from "@/lib/format-price";
import { publicBookingErrorMessage } from "@/lib/public-booking-errors";
import type { PublicSite } from "./types";

type BookingResult = {
  bookingId: Id<"bookings">;
  serviceName: string;
  staffName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
};

type PendingBooking = {
  challengeId: Id<"booking_email_verifications">;
  expiresAt: number;
  resendAfter: number;
  orgId: Id<"orgs">;
  serviceId: Id<"services">;
  staffId: Id<"staff_members">;
  startAt: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote?: string;
};

function dateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("mk-MK", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("mk-MK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function BookingForm({
  site,
  initialServiceId,
}: {
  site: PublicSite;
  initialServiceId?: string;
}) {
  const defaultServiceId = site.services.some(
    (service) => service._id === initialServiceId,
  )
    ? initialServiceId!
    : site.services[0]?._id;
  const today = useMemo(
    () => dateInTimezone(new Date(), site.bookingSettings.timezone),
    [site.bookingSettings.timezone],
  );
  const maxDate = useMemo(
    () =>
      addDays(today, Math.max(site.bookingSettings.bookingWindowDays - 1, 0)),
    [site.bookingSettings.bookingWindowDays, today],
  );

  const [serviceId, setServiceId] = useState<string | undefined>(
    defaultServiceId,
  );
  const [staffId, setStaffId] = useState<"any" | string>("any");
  const [date, setDate] = useState(today);
  const [slotValue, setSlotValue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(
    null,
  );
  const [clock, setClock] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const service = site.services.find((item) => item._id === serviceId);
  const eligibleStaff = service
    ? site.staff.filter((member) => service.staffIds.includes(member._id))
    : [];
  const slots = useQuery(
    api.publicBooking.getPublicSlots,
    service && date
      ? {
          orgId: site._id,
          serviceId: service._id,
          staffId: staffId === "any" ? "any" : (staffId as Id<"staff_members">),
          date,
        }
      : "skip",
  );
  const requestBookingEmailOtp = useAction(
    api.publicBooking.requestBookingEmailOtp,
  );
  const confirmPublicBooking = useAction(
    api.publicBooking.confirmPublicBooking,
  );
  const selectedSlot = slots?.find(
    (slot) => String(slot.startAt) === slotValue,
  );

  useEffect(() => {
    if (!pendingBooking) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [pendingBooking]);

  const resetAvailability = () => {
    setSlotValue("");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!service || !selectedSlot) {
      setError("Изберете услуга, датум и слободен термин.");
      return;
    }

    const bookingStaffId =
      staffId === "any"
        ? selectedSlot.availableStaffIds[0]
        : (staffId as Id<"staff_members">);
    if (!bookingStaffId) {
      setError("Овој термин повеќе не е достапен. Изберете друг термин.");
      return;
    }
    const normalizedEmail = customerEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Внесете е-пошта за да го потврдите терминот.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const challenge = await requestBookingEmailOtp({
        orgId: site._id,
        email: normalizedEmail,
      });
      setPendingBooking({
        ...challenge,
        orgId: site._id,
        serviceId: service._id,
        staffId: bookingStaffId,
        startAt: selectedSlot.startAt,
        customerName: customerName.trim(),
        customerPhone,
        customerEmail: normalizedEmail,
        customerNote: customerNote.trim() || undefined,
      });
      setOtp("");
      setClock(Date.now());
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingBooking || otp.length !== 6) {
      setError("Внесете го шестцифрениот код од е-поштата.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const booking = await confirmPublicBooking({
        orgId: pendingBooking.orgId,
        serviceId: pendingBooking.serviceId,
        staffId: pendingBooking.staffId,
        startAt: pendingBooking.startAt,
        customerName: pendingBooking.customerName,
        customerPhone: pendingBooking.customerPhone,
        customerEmail: pendingBooking.customerEmail,
        customerNote: pendingBooking.customerNote,
        challengeId: pendingBooking.challengeId,
        otp,
      });
      setResult(booking);
      setPendingBooking(null);
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
      setOtp("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingBooking || clock < pendingBooking.resendAfter) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const challenge = await requestBookingEmailOtp({
        orgId: pendingBooking.orgId,
        email: pendingBooking.customerEmail,
      });
      setPendingBooking((current) =>
        current ? { ...current, ...challenge } : current,
      );
      setOtp("");
      setClock(Date.now());
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const secondsUntilResend = pendingBooking
    ? Math.max(0, Math.ceil((pendingBooking.resendAfter - clock) / 1_000))
    : 0;
  const minutesUntilExpiry = pendingBooking
    ? Math.max(0, Math.ceil((pendingBooking.expiresAt - clock) / 60_000))
    : 0;

  if (result) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary text-success">
              <CheckCircle2 aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-3xl">
              Терминот е потврден
            </CardTitle>
            <CardDescription>
              {site.name} веќе го има терминот во својот календар. Испративме
              преглед и календарска покана на вашата е-пошта.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 rounded-xl border border-border bg-secondary/60 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Услуга</dt>
                <dd className="font-medium">{result.serviceName}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Со</dt>
                <dd className="font-medium">{result.staffName}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Датум</dt>
                <dd className="font-medium">{formatDate(result.startAt)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Време</dt>
                <dd className="font-mono font-medium">
                  {formatTime(result.startAt)}–{formatTime(result.endAt)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Цена</dt>
                <dd className="font-medium">
                  {formatPrice(
                    result.priceMinorUnits,
                    result.currency,
                    site.bookingSettings.locale,
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">
                <ArrowLeft data-icon="inline-start" />
                Назад кон студиото
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResult(null);
                setSlotValue("");
              }}
            >
              Резервирај друг термин
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  if (pendingBooking) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <MailCheck aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-3xl">
              Проверете ја е-поштата
            </CardTitle>
            <CardDescription className="max-w-xl leading-6">
              Испративме шестцифрен код на{" "}
              <span className="font-medium text-foreground">
                {pendingBooking.customerEmail}
              </span>
              . Терминот ќе се додаде дури откако ќе го внесете кодот.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleVerify}>
            <CardContent className="flex flex-col gap-6">
              <dl className="grid gap-4 rounded-xl border border-border bg-secondary/60 p-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">Услуга</dt>
                  <dd className="font-medium">{service?.name}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">Датум</dt>
                  <dd className="font-medium">
                    {formatDate(pendingBooking.startAt)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">Време</dt>
                  <dd className="font-mono font-medium">
                    {formatTime(pendingBooking.startAt)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">Студио</dt>
                  <dd className="font-medium">{site.name}</dd>
                </div>
              </dl>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="booking-verification-code">
                  Код за потврда
                </FieldLabel>
                <InputOTP
                  id="booking-verification-code"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError(null);
                  }}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                  disabled={isSubmitting}
                  aria-invalid={Boolean(error)}
                  containerClassName="w-full"
                >
                  <InputOTPGroup className="w-full">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={Boolean(error)}
                        className="h-12 flex-1 text-base"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription>
                  {minutesUntilExpiry > 0
                    ? "Кодот важи уште околу " + minutesUntilExpiry + " мин."
                    : "Кодот истече. Побарајте нов код."}
                </FieldDescription>
                <FieldError>{error}</FieldError>
              </Field>

              <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                Кодот е еднократен. Нема да креираме профил и нема да ја
                користиме е-поштата за маркетинг.
              </div>
            </CardContent>
            <CardFooter className="mt-6 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                size="lg"
                disabled={
                  isSubmitting || otp.length !== 6 || minutesUntilExpiry === 0
                }
                className="sm:flex-1"
              >
                {isSubmitting ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CalendarCheck data-icon="inline-start" />
                )}
                Потврди го терминот
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || secondsUntilResend > 0}
                onClick={handleResend}
              >
                <RefreshCw data-icon="inline-start" />
                {secondsUntilResend > 0
                  ? "Нов код за " + secondsUntilResend + "с"
                  : "Испрати нов код"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setPendingBooking(null);
                  setOtp("");
                  setError(null);
                }}
              >
                Промени ги деталите
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:px-8">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Button asChild variant="link" className="w-fit px-0">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Назад кон {site.name}
          </Link>
        </Button>
        <div className="flex flex-col gap-3">
          <p className="micro-label text-muted-foreground">Нов термин</p>
          <h1 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Изберете време што ви одговара
          </h1>
          <p className="text-pretty leading-7 text-muted-foreground">
            Не е потребен кориснички профил. Изберете услуга и термин, а потоа
            потврдете ја резервацијата со код испратен на е-пошта.
          </p>
        </div>
        {service && (
          <Card>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.durationMins} минути</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-semibold">
                {formatPrice(
                  service.priceMinorUnits,
                  service.currency,
                  site.bookingSettings.locale,
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </aside>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Детали за резервацијата
          </CardTitle>
          <CardDescription>
            Сите полиња со ѕвездичка се задолжителни.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="booking-service">Услуга *</FieldLabel>
                <Select
                  value={serviceId}
                  onValueChange={(value) => {
                    setServiceId(value);
                    setStaffId("any");
                    resetAvailability();
                  }}
                >
                  <SelectTrigger id="booking-service" className="w-full">
                    <SelectValue placeholder="Изберете услуга" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {site.services.map((item) => (
                        <SelectItem key={item._id} value={item._id}>
                          {item.name} · {item.durationMins} мин
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="booking-staff">Член од тимот</FieldLabel>
                <Select
                  value={staffId}
                  onValueChange={(value) => {
                    setStaffId(value);
                    resetAvailability();
                  }}
                  disabled={!service}
                >
                  <SelectTrigger id="booking-staff" className="w-full">
                    <SelectValue placeholder="Изберете член од тимот" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="any">
                        Кој било слободен член
                      </SelectItem>
                      {eligibleStaff.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          {member.displayName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Ако немате претпочитан член, ќе го избереме првиот слободен.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="booking-date">Датум *</FieldLabel>
                <Input
                  id="booking-date"
                  type="date"
                  min={today}
                  max={maxDate}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    resetAvailability();
                  }}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Слободен термин *</FieldLabel>
                {slots === undefined ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="h-9 w-full" />
                    ))}
                  </div>
                ) : slots.length > 0 ? (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={2}
                    value={slotValue}
                    onValueChange={(value) => {
                      setSlotValue(value);
                      setError(null);
                    }}
                    className="flex w-full flex-wrap justify-start"
                    aria-label="Изберете термин"
                  >
                    {slots.map((slot) => (
                      <ToggleGroupItem
                        key={slot.startAt}
                        value={String(slot.startAt)}
                        aria-label={formatTime(slot.startAt)}
                        className="min-w-20 font-mono"
                      >
                        {formatTime(slot.startAt)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarDays />
                      </EmptyMedia>
                      <EmptyTitle>Нема слободни термини</EmptyTitle>
                      <EmptyDescription>
                        Изберете друг датум или друг член од тимот.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="customer-name">
                    Име и презиме *
                  </FieldLabel>
                  <Input
                    id="customer-name"
                    name="name"
                    autoComplete="name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-phone">Телефон *</FieldLabel>
                  <Input
                    id="customer-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+389 70 123 456"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="customer-email">Е-пошта *</FieldLabel>
                <Input
                  id="customer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  required
                />
                <FieldDescription>
                  Ќе испратиме еднократен код, а по потврдата и целосен преглед
                  на терминот.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="customer-note">Забелешка</FieldLabel>
                <Textarea
                  id="customer-note"
                  name="note"
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  maxLength={1_000}
                  placeholder="Додајте нешто што студиото треба да го знае."
                />
                <FieldDescription>Незадолжително</FieldDescription>
              </Field>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Резервацијата не е зачувана</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-6 flex-col items-stretch gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={
                isSubmitting ||
                !service ||
                !selectedSlot ||
                !customerEmail.trim()
              }
            >
              {isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CalendarCheck data-icon="inline-start" />
              )}
              Испрати код за потврда
            </Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Терминот се додава во календарот на {site.name} дури откако ќе го
              внесете кодот од е-поштата.
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
