"use client";

import { useState } from "react";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StepFrame, WizardActions } from "./OnboardingStep";

import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DAYS_MK, onboardingError } from "@/lib/i18n/onboarding";
import { applyHoursToOpenDays, type OpeningHour } from "@/lib/opening-hours";
export type { OpeningHour } from "@/lib/opening-hours";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function HoursStep({
  hours,
  canGoBack,
  onBack,
  onSaved,
}: {
  hours: OpeningHour[];
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (hours: OpeningHour[]) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const days = language === "mk" ? DAYS_MK : DAYS;
  const [applied, setApplied] = useState(false);
  const [draftHours, setDraftHours] = useState(hours);
  const [error, setError] = useState<string | null>(null);
  const [invalidDay, setInvalidDay] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateDay = (dayOfWeek: number, patch: Partial<OpeningHour>) => {
    setDraftHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
    setApplied(false);
    setError(null);
    setInvalidDay(null);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = draftHours.find(
      (day) =>
        !day.isClosed && (!day.open || !day.close || day.open >= day.close),
    );
    if (invalid) {
      setInvalidDay(invalid.dayOfWeek);
      setError(
        t(
          `Choose a closing time after opening for ${days[invalid.dayOfWeek]}.`,
          `Времето на затворање мора да биде по отворањето за ${days[invalid.dayOfWeek]}.`,
        ),
      );
      document.getElementById(`hours-close-${invalid.dayOfWeek}`)?.focus();
      return;
    }
    if (draftHours.every((day) => day.isClosed)) {
      setError(
        t(
          "Choose at least one day when your studio is open.",
          "Изберете барем еден работен ден.",
        ),
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaved(draftHours);
    } catch (caught) {
      setError(onboardingError(caught, language));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        title={t(
          "When can customers book?",
          "Кога можат клиентите да закажуваат?",
        )}
        description={t(
          "Set your first open day, then apply those hours to the other open days.",
          "Поставете го првиот работен ден, па применете ги часовите на останатите работни денови.",
        )}
      >
        <FieldGroup className="gap-3">
          {draftHours.map((day) => (
            <fieldset
              key={day.dayOfWeek}
              className="min-w-0 rounded-2xl border border-border/70 bg-card px-4 pb-4 pt-2 sm:px-5"
              disabled={isSubmitting}
            >
              <legend className="sr-only">{days[day.dayOfWeek]}</legend>
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {days[day.dayOfWeek]}
                </span>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs text-muted-foreground">
                  {day.isClosed
                    ? t("Closed", "Неработен")
                    : t("Open", "Работен")}
                  <Switch
                    checked={!day.isClosed}
                    aria-label={t(
                      `${days[day.dayOfWeek]} open`,
                      `${days[day.dayOfWeek]} е работен ден`,
                    )}
                    onCheckedChange={(open) =>
                      updateDay(day.dayOfWeek, { isClosed: !open })
                    }
                  />
                </label>
              </div>
              {!day.isClosed && (
                <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["open", "close"] as const).map((edge) => (
                    <Field
                      key={edge}
                      className="min-w-0 gap-2"
                      data-invalid={invalidDay === day.dayOfWeek}
                    >
                      <FieldLabel
                        htmlFor={`hours-${edge}-${day.dayOfWeek}`}
                        className="text-xs text-muted-foreground"
                      >
                        {edge === "open"
                          ? t("Opens", "Отворање")
                          : t("Closes", "Затворање")}
                      </FieldLabel>
                      <Input
                        id={`hours-${edge}-${day.dayOfWeek}`}
                        type="time"
                        required
                        value={day[edge]}
                        aria-label={`${days[day.dayOfWeek]} ${edge === "open" ? t("opens", "отворање") : t("closes", "затворање")}`}
                        aria-invalid={invalidDay === day.dayOfWeek}
                        aria-describedby={
                          invalidDay === day.dayOfWeek
                            ? "hours-error"
                            : undefined
                        }
                        className="h-12 min-w-0 w-full max-w-full appearance-none px-3 text-base tabular-nums md:text-base [&::-webkit-date-and-time-value]:text-left"
                        onInput={(event) =>
                          updateDay(day.dayOfWeek, {
                            [edge]: event.currentTarget.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              )}
              {day === draftHours.find((item) => !item.isClosed) && (
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full whitespace-normal"
                    disabled={!day.open || !day.close || day.open >= day.close}
                    onClick={() => {
                      setDraftHours((current) =>
                        applyHoursToOpenDays(current, day),
                      );
                      setError(null);
                      setInvalidDay(null);
                      setApplied(true);
                    }}
                  >
                    {t(
                      "Apply to all open days",
                      "Примени на сите работни денови",
                    )}
                  </Button>
                  {applied && (
                    <p role="status" className="text-xs text-muted-foreground">
                      {t(
                        "Hours copied. Closed days stay closed.",
                        "Часовите се копирани. Неработните денови остануваат неработни.",
                      )}
                    </p>
                  )}
                </div>
              )}
              {invalidDay === day.dayOfWeek && (
                <FieldError
                  id="hours-error"
                  className="mt-3"
                  aria-live="polite"
                >
                  {error}
                </FieldError>
              )}
            </fieldset>
          ))}
        </FieldGroup>
        {error && invalidDay === null && (
          <FieldError className="mt-4" aria-live="polite">
            {error}
          </FieldError>
        )}
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isSubmitting}
        />
      </StepFrame>
    </form>
  );
}
