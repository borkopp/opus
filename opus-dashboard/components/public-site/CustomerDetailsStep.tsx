"use client";

import { usePublicBookingI18n } from "./PublicBookingI18n";

import { AlertCircle, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
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
  rememberedClient?: boolean;
  selectedStaffId: string;
  selectedServiceId: string;
  selectedSlotTimestamp: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote: string;
  createAccount: boolean;
  onChangeCreateAccount: (value: boolean) => void;
  securityReady: boolean;
  securityCheck?: React.ReactNode;
  offerPriceMinorUnits?: number;
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
  rememberedClient = false,
  selectedStaffId,
  selectedServiceId,
  selectedSlotTimestamp,
  customerName,
  customerEmail,
  customerPhone,
  customerNote,
  createAccount,
  onChangeCreateAccount,
  securityReady,
  securityCheck,
  offerPriceMinorUnits,
  isSubmitting,
  error,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeNote,
  onSubmit,
  onBack,
}: CustomerDetailsStepProps) {
  const { text, locale } = usePublicBookingI18n();
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const staff = site.staff.find((member) => member._id === selectedStaffId);
  const endAt =
    selectedSlotTimestamp + (service?.durationMins ?? 0) * 60 * 1000;

  return (
    <BookingStepShell
      title={text("Ваши податоци")}
      backLabel={text("Назад кон термини")}
      onBack={onBack}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border bg-card p-5 text-sm shadow-s sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{text("Услуга")}</dt>
          <dd className="font-medium">{service?.name}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 text-right">
          <dt className="text-xs text-muted-foreground">
            {text("Специјалист")}
          </dt>
          <dd className="font-medium">{staff?.displayName}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">
            {text("Датум и време")}
          </dt>
          <dd className="font-medium">
            {formatBookingDate(selectedSlotTimestamp, locale)}
          </dd>
          <dd className="font-mono text-muted-foreground">
            {formatBookingTime(selectedSlotTimestamp)}–
            {formatBookingTime(endAt)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 text-right">
          <dt className="text-xs text-muted-foreground">{text("Цена")}</dt>
          <dd className="font-mono font-medium">
            {service &&
              formatPrice(
                offerPriceMinorUnits ?? service.priceMinorUnits,
                service.currency,
                site.bookingSettings.locale,
              )}
          </dd>
        </div>
      </dl>

      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="customer-name">
              {text("Име и презиме")}
            </FieldLabel>
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
            <FieldLabel htmlFor="customer-email">{text("Е-пошта")}</FieldLabel>
            <Input
              readOnly={rememberedClient}
              id="customer-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={customerEmail}
              onChange={(event) => onChangeEmail(event.target.value)}
              required
            />
            <FieldDescription>
              {rememberedClient
                ? text("Е-поштата е потврдена преку вашата OPUS сметка.")
                : offerPriceMinorUnits !== undefined
                  ? text(
                      "Внесете ја е-поштата на која ја добивте понудата. На неа ќе го испратиме кодот за потврда.",
                    )
                  : text("На оваа адреса ќе го испратиме кодот за потврда.")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-phone">{text("Телефон")}</FieldLabel>
            <Input
              id="customer-phone"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+389 70 123 456"
              value={customerPhone}
              onChange={(event) => onChangePhone(event.target.value)}
              required
            />
            <FieldDescription>
              {text(
                "Студиото може да го користи бројот за контакт околу терминот.",
              )}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-note">
              {text("Забелешка")}{" "}
              <span className="text-muted-foreground">
                {text("(опционално)")}
              </span>
            </FieldLabel>
            <Textarea
              id="customer-note"
              name="note"
              value={customerNote}
              onChange={(event) => onChangeNote(event.target.value)}
              maxLength={1_000}
              placeholder={text("Додајте нешто што студиото треба да го знае.")}
            />
          </Field>

          {!rememberedClient && (
            <Field orientation="horizontal" variant="surface">
              <Checkbox
                id="create-client-account"
                checked={createAccount}
                onCheckedChange={(checked) =>
                  onChangeCreateAccount(checked === true)
                }
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="create-client-account">
                  {text("Создај OPUS сметка")}
                </FieldLabel>
                <FieldDescription>
                  {text(
                    "Со истиот код ќе се најавите и ќе го потврдите терминот. Следниот пат закажете побрзо со зачувани податоци.",
                  )}
                </FieldDescription>
              </div>
            </Field>
          )}
          {!rememberedClient && createAccount && securityCheck}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{text("Терминот сè уште не е зачуван")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>

        <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <p>
            {rememberedClient
              ? text("Терминот ќе биде зачуван во вашата OPUS сметка.")
              : createAccount
                ? text(
                    "Вашата сметка ќе ги прикажува само вашите термини. Секое студио ги гледа само своите записи.",
                  )
                : text(
                    "Продолжувате како гостин. Со кодот ќе го потврдите само терминот.",
                  )}
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={
            isSubmitting ||
            !customerName.trim() ||
            !customerEmail.trim() ||
            (!rememberedClient && createAccount && !securityReady)
          }
          className="w-full"
        >
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Mail data-icon="inline-start" />
          )}
          {rememberedClient
            ? text("Потврди термин")
            : text("Испрати код за потврда")}
        </Button>
      </form>
    </BookingStepShell>
  );
}
