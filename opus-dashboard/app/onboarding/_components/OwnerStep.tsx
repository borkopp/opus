"use client";

import { useState } from "react";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { onboardingError } from "@/lib/i18n/onboarding";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function OwnerStep({
  name,
  onBack,
  onSaved,
}: {
  name: string;
  onBack: () => void;
  onSaved: (name: string) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const [draftName, setName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name || name.length > 100) {
      setError(
        t(
          "Enter your name using 1 to 100 characters.",
          "Внесете го вашето име со 1 до 100 знаци.",
        ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaved(name);
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
        title={t("What’s your name?", "Како се викате?")}
        description={t(
          "Customers will see this name when booking an appointment with you.",
          "Клиентите ќе го гледаат ова име кога закажуваат термин кај вас.",
        )}
      >
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel data-replay-public htmlFor="owner-name">
              {t("Your name", "Вашето име")}
            </FieldLabel>
            <Input
              id="owner-name"
              name="name"
              value={draftName}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              maxLength={100}
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "owner-name-error" : undefined}
              className="min-h-12"
            />
            {error && (
              <FieldError id="owner-name-error" role="alert">
                {error}
              </FieldError>
            )}
          </Field>
        </FieldGroup>
        <WizardActions canGoBack onBack={onBack} isSubmitting={saving} />
      </StepFrame>
    </form>
  );
}
