"use client";

import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeft, CalendarCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  formatBookingDate,
  formatBookingTime,
} from "@/lib/public-booking-format";

interface OtpVerificationStepProps {
  customerEmail: string;
  serviceName: string;
  staffName: string;
  startAt: number;
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
  customerEmail,
  serviceName,
  staffName,
  startAt,
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
    <section className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSubmitting}
        onClick={onBack}
        className="w-fit"
      >
        <ArrowLeft data-icon="inline-start" />
        Промени податоци
      </Button>

      <div className="flex flex-col gap-3">
        <p className="micro-label text-primary">Последен чекор</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Проверете ја е-поштата
        </h1>
        <p className="leading-7 text-muted-foreground">
          Испративме шестцифрен код на{" "}
          <span className="font-medium text-foreground">{customerEmail}</span>.
          Терминот ќе биде зачуван откако ќе го внесете кодот.
        </p>
      </div>

      <dl className="grid gap-4 rounded-2xl border bg-card p-5 text-sm shadow-s sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Услуга</dt>
          <dd className="font-medium">{serviceName}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:text-right">
          <dt className="text-xs text-muted-foreground">Специјалист</dt>
          <dd className="font-medium">{staffName}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Термин</dt>
          <dd className="font-medium">{formatBookingDate(startAt)}</dd>
          <dd className="font-mono text-muted-foreground">
            {formatBookingTime(startAt)}
          </dd>
        </div>
      </dl>

      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="booking-otp-input">Код за потврда</FieldLabel>
          <InputOTP
            id="booking-otp-input"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={otp}
            onChange={onChangeOtp}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
            containerClassName="w-full"
          >
            <InputOTPGroup className="w-full justify-center">
              {Array.from({ length: 6 }).map((_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  aria-invalid={Boolean(error)}
                  className="size-11 sm:size-12"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              {minutesUntilExpiry > 0
                ? `Кодот важи уште околу ${minutesUntilExpiry} мин.`
                : "Кодот истече. Побарајте нов код."}
            </FieldDescription>
          )}
        </Field>

        <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <p>Кодот е еднократен и не создава кориснички профил.</p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={
            isSubmitting || otp.length !== 6 || minutesUntilExpiry === 0
          }
          className="w-full"
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
          onClick={onResend}
          className="w-full"
        >
          <RefreshCw data-icon="inline-start" />
          {secondsUntilResend > 0
            ? `Нов код за ${secondsUntilResend}с`
            : "Испрати нов код"}
        </Button>
      </form>
    </section>
  );
}
