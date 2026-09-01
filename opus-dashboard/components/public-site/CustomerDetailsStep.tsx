"use client";

import { AlertCircle, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format-price";
import {
  formatBookingDate,
  formatBookingTime,
} from "@/lib/public-booking-format";
import { BookingStepShell } from "./BookingStepShell";
import type { PublicSite } from "./types";

interface CustomerDetailsStepProps {
  site: PublicSite;
  selectedStaffId: string;
  selectedServiceId: string;
  selectedSlotTimestamp: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote: string;
  isSubmitting: boolean;
  error: string | null;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeNote: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
}

export function CustomerDetailsStep({
  site,
  selectedStaffId,
  selectedServiceId,
  selectedSlotTimestamp,
  customerName,
  customerEmail,
  customerPhone,
  customerNote,
  isSubmitting,
  error,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeNote,
  onSubmit,
  onBack,
}: CustomerDetailsStepProps) {
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const staff = site.staff.find((member) => member._id === selectedStaffId);
  const endAt =
    selectedSlotTimestamp + (service?.durationMins ?? 0) * 60 * 1000;

  return (
    <BookingStepShell
      title="Ваши податоци"
      description="Ќе испратиме еднократен код на е-пошта пред да го зачуваме терминот."
      backLabel="Назад кон термини"
      onBack={onBack}
    >
      <dl className="grid gap-4 rounded-2xl border bg-card p-5 text-sm shadow-s sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Услуга</dt>
          <dd className="font-medium">{service?.name}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:text-right">
          <dt className="text-xs text-muted-foreground">Специјалист</dt>
          <dd className="font-medium">{staff?.displayName}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Датум и време</dt>
          <dd className="font-medium">
            {formatBookingDate(selectedSlotTimestamp)}
          </dd>
          <dd className="font-mono text-muted-foreground">
            {formatBookingTime(selectedSlotTimestamp)}–
            {formatBookingTime(endAt)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:text-right">
          <dt className="text-xs text-muted-foreground">Цена</dt>
          <dd className="font-mono font-medium">
            {service &&
              formatPrice(
                service.priceMinorUnits,
                service.currency,
                site.bookingSettings.locale,
              )}
          </dd>
        </div>
      </dl>

      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="customer-name">Име и презиме</FieldLabel>
            <Input
              id="customer-name"
              name="name"
              autoComplete="name"
              value={customerName}
              onChange={(event) => onChangeName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-email">Е-пошта</FieldLabel>
            <Input
              id="customer-email"
              name="email"
              type="email"
              autoComplete="email"
              value={customerEmail}
              onChange={(event) => onChangeEmail(event.target.value)}
              required
            />
            <FieldDescription>
              На оваа адреса ќе го испратиме кодот за потврда.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-phone">
              Телефон{" "}
              <span className="text-muted-foreground">(опционално)</span>
            </FieldLabel>
            <Input
              id="customer-phone"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+389 70 123 456"
              value={customerPhone}
              onChange={(event) => onChangePhone(event.target.value)}
            />
            <FieldDescription>
              Студиото може да го користи бројот за контакт околу терминот.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-note">
              Забелешка{" "}
              <span className="text-muted-foreground">(опционално)</span>
            </FieldLabel>
            <Textarea
              id="customer-note"
              name="note"
              value={customerNote}
              onChange={(event) => onChangeNote(event.target.value)}
              maxLength={1_000}
              placeholder="Додајте нешто што студиото треба да го знае."
            />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Терминот сè уште не е зачуван</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>

        <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <p>
            Не е потребен профил. Податоците му овозможуваат на студиото да го
            евидентира и управува со терминот.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={
            isSubmitting || !customerName.trim() || !customerEmail.trim()
          }
          className="w-full"
        >
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Mail data-icon="inline-start" />
          )}
          Испрати код за потврда
        </Button>
      </form>
    </BookingStepShell>
  );
}
