"use client";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  DAYS_MK,
  DAYS_SQ,
  DAYS_SHORT_EN,
  DAYS_SHORT_MK,
  DAYS_SHORT_SQ,
  onboardingError,
} from "@/lib/i18n/onboarding";
import { applyHoursToOpenDays, type OpeningHour } from "@/lib/opening-hours";
import { StepFrame, WizardActions } from "./OnboardingStep";
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
  minimumDurationMins = 15,
}: {
  hours: OpeningHour[];
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (hours: OpeningHour[]) => Promise<void>;
  minimumDurationMins?: number;
}) {
  const { t, language } = useDashboardI18n();
  const days =
    language === "sq" ? DAYS_SQ : language === "mk" ? DAYS_MK : DAYS;
  const daysShort =
    language === "sq"
      ? DAYS_SHORT_SQ
      : language === "mk"
        ? DAYS_SHORT_MK
        : DAYS_SHORT_EN;
  const first = hours.find((day) => !day.isClosed) ?? hours[0];
  const [draft, setDraft] = useState(hours);
  const [common, setCommon] = useState({
    open: first.open,
    close: first.close,
  });
  const [custom, setCustom] = useState(
    hours.some(
      (day) =>
        !day.isClosed && (day.open !== first.open || day.close !== first.close),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const effectiveHours = custom
    ? draft
    : applyHoursToOpenDays(draft, { ...first, ...common });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const open = effectiveHours.filter((day) => !day.isClosed);
    if (!open.length) {
      setError(
        t(
          "Choose at least one working day.",
          "Изберете барем еден работен ден.",
          "Zgjidhni të paktën një ditë pune.",
        ),
      );
      return;
    }
    if (
      open.some(
        (day) =>
          !/^\d{2}:\d{2}$/.test(day.open) ||
          !/^\d{2}:\d{2}$/.test(day.close) ||
          day.open >= day.close,
      )
    ) {
      setError(
        t(
          "Closing time must be after opening time.",
          "Времето на затворање мора да биде по отворањето.",
          "Koha e mbylljes duhet të jetë pas kohës së hapjes.",
        ),
      );
      return;
    }
    const minutes = (time: string) =>
      Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    if (
      !open.some(
        (day) => minutes(day.close) - minutes(day.open) >= minimumDurationMins,
      )
    ) {
      setError(
        t(
          "Allow enough time for at least one appointment.",
          "Оставете доволно време за барем еден термин.",
          "Lini kohë të mjaftueshme për të paktën një termin.",
        ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaved(effectiveHours);
    } catch (caught) {
      setError(onboardingError(caught, language));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        replayPublicTitle
        replayPublicDescription
        title={t(
          "When can customers book?",
          "Кога можат клиентите да закажуваат?",
          "Kur mund të rezervojnë klientët?",
        )}
        description={t(
          "Choose your working days and confirm the hours customers can book.",
          "Изберете работни денови и потврдете кога клиентите можат да закажуваат.",
          "Zgjidhni ditët tuaja të punës dhe konfirmoni orët kur klientët mund të rezervojnë.",
        )}
      >
        <FieldGroup>
          <Field>
            <FieldLabel data-replay-public>
              {t("Working days", "Работни денови", "Ditët e punës")}
            </FieldLabel>
            <ToggleGroup
              type="multiple"
              variant="selection"
              spacing={2}
              className="grid w-full grid-cols-4 gap-2 sm:grid-cols-7"
              disabled={saving}
              value={draft
                .filter((day) => !day.isClosed)
                .map((day) => String(day.dayOfWeek))}
              onValueChange={(selected) => {
                setDraft((current) =>
                  current.map((day) => ({
                    ...day,
                    isClosed: !selected.includes(String(day.dayOfWeek)),
                  })),
                );
                setError(null);
              }}
              aria-label={t("Working days", "Работни денови", "Ditët e punës")}
            >
              {days.map((day, i) => (
                <ToggleGroupItem
                  data-replay-public
                  key={day}
                  value={String(i)}
                  aria-label={day}
                  className="h-auto min-h-18 w-full flex-col gap-1.5 rounded-lg px-2 py-3"
                >
                  <span>{daysShort[i]}</span>
                  {draft.find((item) => item.dayOfWeek === i)?.isClosed ? (
                    <Minus aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
              data-replay-public
            >
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden="true" />
                {t("Working day", "Работен ден", "Ditë pune")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Minus className="size-4" aria-hidden="true" />
                {t("Day off", "Неработен ден", "Ditë pushimi")}
              </span>
            </FieldDescription>
          </Field>
          {!custom && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["open", "close"] as const).map((edge) => (
                <Field key={edge}>
                  <FieldLabel data-replay-public htmlFor={`hours-${edge}`}>
                    {edge === "open"
                      ? t("Opens", "Отворање", "Hapet")
                      : t("Closes", "Затворање", "Mbyllet")}
                  </FieldLabel>
                  <Input
                    id={`hours-${edge}`}
                    type="time"
                    value={common[edge]}
                    required
                    disabled={saving}
                    className="min-h-12 min-w-0 w-full max-w-full appearance-none text-base [&::-webkit-date-and-time-value]:text-left"
                    onChange={(e) => {
                      setCommon({ ...common, [edge]: e.target.value });
                      setError(null);
                    }}
                  />
                </Field>
              ))}
            </div>
          )}
          <Button
            data-replay-public
            type="button"
            variant="outline"
            className="min-h-11 h-auto whitespace-normal"
            disabled={saving}
            onClick={() => {
              if (!custom) setDraft(effectiveHours);
              setCustom(!custom);
              setError(null);
            }}
          >
            {custom
              ? t(
                  "Use the same hours on selected days",
                  "Исто време за избраните денови",
                  "Përdor të njëjtin orar në ditët e zgjedhura",
                )
              : t(
                  "Set different hours per day",
                  "Различно време по ден",
                  "Cakto orare të ndryshme për çdo ditë",
                )}
          </Button>
          {custom && (
            <div className="flex flex-col gap-4">
              {draft
                .filter((day) => !day.isClosed)
                .map((day) => (
                  <fieldset
                    key={day.dayOfWeek}
                    disabled={saving}
                    className="min-w-0 rounded-2xl border border-border p-4"
                  >
                    <legend
                      data-replay-public
                      className="px-2 text-sm font-medium"
                    >
                      {days[day.dayOfWeek]}
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(["open", "close"] as const).map((edge) => (
                        <Field key={edge}>
                          <FieldLabel
                            data-replay-public
                            htmlFor={`hours-${edge}-${day.dayOfWeek}`}
                          >
                            {edge === "open"
                              ? t("Opens", "Отворање", "Hapet")
                              : t("Closes", "Затворање", "Mbyllet")}
                          </FieldLabel>
                          <Input
                            id={`hours-${edge}-${day.dayOfWeek}`}
                            type="time"
                            required
                            value={day[edge]}
                            className="min-h-12 min-w-0 w-full max-w-full appearance-none text-base"
                            onChange={(e) =>
                              setDraft((current) =>
                                current.map((item) =>
                                  item.dayOfWeek === day.dayOfWeek
                                    ? { ...item, [edge]: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  </fieldset>
                ))}
            </div>
          )}
          {error && <FieldError role="alert">{error}</FieldError>}
        </FieldGroup>
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={saving}
          label={t(
            "Confirm working hours",
            "Потврди работно време",
            "Konfirmo orarin e punës",
          )}
        />
      </StepFrame>
    </form>
  );
}
