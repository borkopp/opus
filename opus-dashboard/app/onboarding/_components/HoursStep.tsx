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

export interface OpeningHour {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
}
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
        `Choose a closing time after opening for ${DAYS[invalid.dayOfWeek]}.`,
      );
      document.getElementById(`hours-close-${invalid.dayOfWeek}`)?.focus();
      return;
    }
    if (draftHours.every((day) => day.isClosed)) {
      setError("Choose at least one day when your studio is open.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaved(draftHours);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your hours. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame title="When can customers book?">
        <FieldGroup className="gap-3">
          {draftHours.map((day) => (
            <fieldset
              key={day.dayOfWeek}
              className="min-w-0 rounded-2xl border border-border/70 bg-card px-4 pb-4 pt-2 sm:px-5"
              disabled={isSubmitting}
            >
              <legend className="sr-only">{DAYS[day.dayOfWeek]}</legend>
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {DAYS[day.dayOfWeek]}
                </span>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs text-muted-foreground">
                  {day.isClosed ? "Closed" : "Open"}
                  <Switch
                    checked={!day.isClosed}
                    aria-label={`${day.isClosed ? "Open" : "Close"} ${DAYS[day.dayOfWeek]}`}
                    onCheckedChange={(open) =>
                      updateDay(day.dayOfWeek, { isClosed: !open })
                    }
                  />
                </label>
              </div>
              {!day.isClosed && (
                <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  {(["open", "close"] as const).map((edge) => (
                    <Field
                      key={edge}
                      className="min-w-0 gap-2 max-[359px]:grid max-[359px]:grid-cols-[3rem_minmax(0,1fr)] max-[359px]:items-center"
                      data-invalid={invalidDay === day.dayOfWeek}
                    >
                      <FieldLabel
                        htmlFor={`hours-${edge}-${day.dayOfWeek}`}
                        className="text-xs text-muted-foreground"
                      >
                        {edge === "open" ? "Opens" : "Closes"}
                      </FieldLabel>
                      <Input
                        id={`hours-${edge}-${day.dayOfWeek}`}
                        type="time"
                        required
                        value={day[edge]}
                        aria-label={`${DAYS[day.dayOfWeek]} ${edge === "open" ? "opens" : "closes"}`}
                        aria-invalid={invalidDay === day.dayOfWeek}
                        aria-describedby={
                          invalidDay === day.dayOfWeek
                            ? "hours-error"
                            : undefined
                        }
                        className="h-12 min-w-0 w-full px-2 text-base tabular-nums md:text-base"
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
