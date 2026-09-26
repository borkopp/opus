"use client";

import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { beautyCategories, onboardingError } from "@/lib/i18n/onboarding";
import {
  validateFirstService,
  type BeautyCategory,
  type ServiceDraft,
} from "@/lib/onboarding";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function ServiceStep({
  value,
  category,
  slotDurationMins,
  onBack,
  onSaved,
}: {
  value: ServiceDraft;
  category: BeautyCategory;
  slotDurationMins: number;
  onBack: () => void;
  onSaved: (service: ServiceDraft) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const suggestion =
    beautyCategories.find(([key]) => key === category) ?? beautyCategories[0];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validateFirstService(draft, slotDurationMins);
    if (invalid) {
      setError(
        invalid === "name"
          ? t("Enter a service name.", "Внесете име на услугата.")
          : invalid === "price"
            ? t("Enter a valid price.", "Внесете валидна цена.")
            : t(
                `Use a duration in multiples of ${slotDurationMins} minutes.`,
                `Внесете времетраење во интервали од ${slotDurationMins} минути.`,
              ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaved({
        ...draft,
        name: draft.name.trim(),
        price: draft.price.trim(),
      });
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
        title={t("What can customers book?", "Што можат клиентите да закажат?")}
        description={t(
          "One service is enough to start. Add the rest whenever you’re ready.",
          "Една услуга е доволна за почеток. Другите додајте ги подоцна.",
        )}
      >
        <FieldGroup>
          <Field>
            <FieldLabel data-replay-public htmlFor="service-name">
              {t("Service name", "Име на услугата")}
            </FieldLabel>
            <Input
              id="service-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              minLength={2}
              disabled={saving}
              className="min-h-12"
            />
            {!draft.name && (
              <Button
                data-replay-public
                type="button"
                variant="outline"
                className="min-h-11 h-auto whitespace-normal"
                disabled={saving}
                onClick={() =>
                  setDraft({ ...draft, name: t(suggestion[3], suggestion[4]) })
                }
              >
                {t(`Use “${suggestion[3]}”`, `Користи „${suggestion[4]}“`)}
              </Button>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel data-replay-public htmlFor="service-price">
                {t("Price (MKD)", "Цена (ден.)")}
              </FieldLabel>
              <Input
                id="service-price"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                required
                placeholder="500"
                disabled={saving}
                className="min-h-12"
              />
            </Field>
            <Field>
              <FieldLabel data-replay-public htmlFor="service-duration">
                {t("Duration (minutes)", "Времетраење (минути)")}
              </FieldLabel>
              <Input
                id="service-duration"
                type="number"
                min={slotDurationMins}
                step={slotDurationMins}
                value={draft.durationMins || ""}
                onChange={(e) =>
                  setDraft({ ...draft, durationMins: Number(e.target.value) })
                }
                required
                disabled={saving}
                className="min-h-12"
              />
            </Field>
          </div>
          <FieldDescription data-replay-public>
            {t(
              "You’ll be the first person offering this service. You can add your team later.",
              "Вие ќе бидете првиот член што ја нуди услугата. Тимот можете да го додадете подоцна.",
            )}
          </FieldDescription>
          {error && <FieldError role="alert">{error}</FieldError>}
        </FieldGroup>
        <WizardActions canGoBack onBack={onBack} isSubmitting={saving} />
      </StepFrame>
    </form>
  );
}
