"use client";

import { useState } from "react";
import { AlertCircle, CalendarCheck, Mail, ShieldCheck } from "lucide-react";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  isValidPublicBookingPhone,
  normalizePublicBookingPhone,
} from "@/lib/public-booking-phone";
import { BookingStepShell } from "./BookingStepShell";
import { BookingSummary } from "./BookingSummary";
import { usePublicBookingI18n } from "./PublicBookingI18n";
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
  const { text } = usePublicBookingI18n();
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneInvalid =
    phoneTouched &&
    !isValidPublicBookingPhone(normalizePublicBookingPhone(customerPhone));
  const service = site.services.find(
    (candidate) => candidate._id === selectedServiceId,
  );
  const staff = site.staff.find((member) => member._id === selectedStaffId);
  return (
    <BookingStepShell
      title={text("Ваши податоци")}
      description={
        rememberedClient
          ? text("Проверете ги вашите податоци и потврдете го терминот.")
          : text(
              "Внесете ги вашите податоци. Ќе добиете код по е-пошта за да го потврдите терминот.",
            )
      }
      backLabel={text("Назад кон термини")}
      onBack={onBack}
      backDisabled={isSubmitting}
      summary={
        service && (
          <BookingSummary
            serviceName={service.name}
            durationMins={service.durationMins}
            priceMinorUnits={offerPriceMinorUnits ?? service.priceMinorUnits}
            currency={service.currency}
            staffName={staff?.displayName}
            startAt={selectedSlotTimestamp}
          />
        )
      }
    >
      <form onSubmit={onSubmit} aria-busy={isSubmitting}>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>
              <h2>{text("Контакт податоци")}</h2>
            </CardTitle>
            <CardDescription>
              {text("Студиото ќе ги користи овие податоци за вашиот термин.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet disabled={isSubmitting}>
              <FieldGroup className="gap-5">
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
                    className="min-h-12"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-email">
                    {text("Е-пошта")}
                  </FieldLabel>
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
                    className="min-h-12"
                    aria-describedby="customer-email-help"
                  />
                  <FieldDescription id="customer-email-help">
                    {rememberedClient
                      ? text("Е-поштата е потврдена преку вашата OPUS сметка.")
                      : offerPriceMinorUnits !== undefined
                        ? text(
                            "Внесете ја е-поштата на која ја добивте понудата. На неа ќе го испратиме кодот за потврда.",
                          )
                        : text(
                            "На оваа адреса ќе го испратиме кодот за потврда.",
                          )}
                  </FieldDescription>
                </Field>
                <Field data-invalid={phoneInvalid}>
                  <FieldLabel htmlFor="customer-phone">
                    {text("Телефон")}
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
                    onBlur={() => setPhoneTouched(true)}
                    required
                    className="min-h-12"
                    aria-invalid={phoneInvalid}
                    aria-describedby={
                      phoneInvalid
                        ? "customer-phone-error"
                        : "customer-phone-help"
                    }
                  />
                  {phoneInvalid ? (
                    <FieldError id="customer-phone-error">
                      {text("Внесете валиден телефонски број.")}
                    </FieldError>
                  ) : (
                    <FieldDescription id="customer-phone-help">
                      {text(
                        "Студиото може да го користи бројот за контакт околу терминот.",
                      )}
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-note">
                    {text("Забелешка")}{" "}
                    <span className="font-normal text-muted-foreground">
                      {text("(опционално)")}
                    </span>
                  </FieldLabel>
                  <Textarea
                    id="customer-note"
                    name="note"
                    value={customerNote}
                    onChange={(event) => onChangeNote(event.target.value)}
                    maxLength={1_000}
                    placeholder={text(
                      "Додајте нешто што студиото треба да го знае.",
                    )}
                    className="min-h-24 resize-y"
                  />
                </Field>
                {!rememberedClient && (
                  <Field
                    orientation="horizontal"
                    variant="surface"
                    className="items-start"
                  >
                    <Checkbox
                      id="create-client-account"
                      checked={createAccount}
                      onCheckedChange={(checked) =>
                        onChangeCreateAccount(checked === true)
                      }
                      className="mt-0.5"
                      aria-describedby="create-client-account-help"
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="create-client-account">
                        {text("Зачувај ги податоците со OPUS сметка")}
                      </FieldLabel>
                      <FieldDescription id="create-client-account-help">
                        {text(
                          "Опционално. Со истиот код ќе создадете сметка за побрзо закажување следниот пат.",
                        )}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
                {!rememberedClient && createAccount && securityCheck}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle />
                    <AlertTitle>
                      {text("Терминот сè уште не е зачуван")}
                    </AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </FieldSet>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <Button
              type="submit"
              size="lg"
              disabled={
                isSubmitting ||
                (!rememberedClient && createAccount && !securityReady)
              }
              className="min-h-12 w-full"
            >
              {isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : rememberedClient ? (
                <CalendarCheck data-icon="inline-start" />
              ) : (
                <Mail data-icon="inline-start" />
              )}
              {isSubmitting
                ? text("Се обработува…")
                : rememberedClient
                  ? text("Потврди термин")
                  : text("Испрати код за потврда")}
            </Button>
            <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                {rememberedClient
                  ? text("Терминот ќе биде зачуван во вашата OPUS сметка.")
                  : createAccount
                    ? text(
                        "Со еден код ќе ја создадете сметката и ќе го потврдите терминот.",
                      )
                    : text(
                        "Продолжувате како гостин. Со кодот ќе го потврдите само терминот.",
                      )}
              </p>
            </div>
          </CardFooter>
        </Card>
      </form>
    </BookingStepShell>
  );
}
