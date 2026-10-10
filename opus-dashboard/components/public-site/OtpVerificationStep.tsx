"use client";

import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { CalendarCheck, RefreshCw } from "lucide-react";
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
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { BookingStepShell } from "./BookingStepShell";
import { usePublicBookingI18n } from "./PublicBookingI18n";

interface OtpVerificationStepProps {
  createAccount?: boolean;
  securityCheck?: React.ReactNode;
  summary?: React.ReactNode;
  customerEmail: string;
  otp: string;
  expiresAt: number;
  resendAfter: number;
  isSubmitting: boolean;
  error: string | null;
  onChangeOtp: (code: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}

export function OtpVerificationStep({
  createAccount = false,
  securityCheck,
  summary,
  customerEmail,
  otp,
  expiresAt,
  resendAfter,
  isSubmitting,
  error,
  onChangeOtp,
  onSubmit,
  onResend,
  onBack,
}: OtpVerificationStepProps) {
  const { text } = usePublicBookingI18n();
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  const secondsUntilResend = Math.max(
    0,
    Math.ceil((resendAfter - clock) / 1_000),
  );
  const minutesUntilExpiry = Math.max(
    0,
    Math.ceil((expiresAt - clock) / 60_000),
  );
  return (
    <BookingStepShell
      title={text("Проверете ја е-поштата")}
      description={text(
        "Уште еден чекор. Внесете го кодот за да го потврдите терминот.",
      )}
      backLabel={text("Промени податоци")}
      onBack={onBack}
      backDisabled={isSubmitting}
      summary={summary}
    >
      <form onSubmit={onSubmit} aria-busy={isSubmitting}>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>
              <h2>{text("Внесете го шестцифрениот код")}</h2>
            </CardTitle>
            <CardDescription>
              {text("Испратен на")}{" "}
              <span className="break-all font-medium text-foreground">
                {customerEmail}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="booking-otp-input" className="sr-only">
                {text("Код за потврда")}
              </FieldLabel>
              <InputOTP
                id="booking-otp-input"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                onChange={onChangeOtp}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={isSubmitting}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? "booking-otp-error" : "booking-otp-help"
                }
                containerClassName="w-full max-w-sm"
              >
                <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      aria-invalid={Boolean(error)}
                      className="h-12 w-full min-w-0 rounded-lg border-l first:rounded-lg last:rounded-lg sm:h-14"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error ? (
                <FieldError id="booking-otp-error">{error}</FieldError>
              ) : (
                <FieldDescription id="booking-otp-help" role="status">
                  {minutesUntilExpiry > 0
                    ? text("Кодот важи уште околу {v0} мин.", {
                        v0: minutesUntilExpiry,
                      })
                    : text("Кодот истече. Побарајте нов код.")}
                </FieldDescription>
              )}
            </Field>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <Button
              type="submit"
              size="lg"
              disabled={
                isSubmitting || otp.length !== 6 || minutesUntilExpiry === 0
              }
              className="min-h-12 w-full"
            >
              {isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CalendarCheck data-icon="inline-start" />
              )}
              {isSubmitting
                ? text("Се обработува…")
                : text("Потврди го терминот")}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {createAccount
                ? text(
                    "Со овој код го потврдувате терминот и автоматски се најавувате на вашата OPUS сметка.",
                  )
                : text(
                    "Кодот го потврдува само терминот. Продолжувате како гостин.",
                  )}
            </p>
          </CardFooter>
        </Card>
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            {text("Не добивте код? Проверете во спам или побарајте нов код.")}
          </p>
          {securityCheck}
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || secondsUntilResend > 0}
            onClick={onResend}
            className="min-h-11 w-full sm:w-fit"
          >
            <RefreshCw data-icon="inline-start" />
            {secondsUntilResend > 0
              ? text("Нов код за {v0}с", { v0: secondsUntilResend })
              : text("Испрати нов код")}
          </Button>
        </div>
      </form>
    </BookingStepShell>
  );
}
