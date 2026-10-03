"use client";

import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { onboardingError } from "@/lib/i18n/onboarding";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function BusinessStep({
  name,
  onSaved,
}: {
  name: string;
  onSaved: (name: string) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const [draftName, setName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (draftName.trim().length < 2) {
      setError(
        t(
          "Enter at least 2 characters for your studio name.",
          "Внесете најмалку 2 знаци за името на студиото.",
          "Shkruani të paktën 2 karaktere për emrin e studios tuaj.",
        ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaved(draftName.trim());
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
          "What’s your studio called?",
          "Како се вика вашето студио?",
          "Si quhet studioja juaj?",
        )}
        description={t(
          "Enter the name your customers know you by.",
          "Внесете го името по кое ве познаваат клиентите.",
          "Shkruani emrin me të cilin ju njohin klientët tuaj.",
        )}
      >
        <FieldGroup>
          <Field>
            <FieldLabel data-replay-public htmlFor="business-name">
              {t("Studio name", "Име на студиото", "Emri i studios")}
            </FieldLabel>
            <Input
              id="business-name"
              value={draftName}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                "e.g. Studio Luna",
                "На пр. Студио Луна",
                "P.sh. Studio Luna",
              )}
              autoComplete="organization"
              required
              minLength={2}
              disabled={saving}
              className="min-h-12"
            />
          </Field>
          {error && <FieldError role="alert">{error}</FieldError>}
        </FieldGroup>
        <WizardActions
          canGoBack={false}
          onBack={() => {}}
          isSubmitting={saving}
        />
      </StepFrame>
    </form>
  );
}
