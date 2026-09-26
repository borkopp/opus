"use client";

import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input, inputVariants } from "@/components/ui/input";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { beautyCategories, onboardingError } from "@/lib/i18n/onboarding";
import type { BeautyCategory } from "@/lib/onboarding";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function BusinessStep({
  name,
  category,
  onSaved,
}: {
  name: string;
  category: BeautyCategory;
  onSaved: (name: string, category: BeautyCategory) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const [draftName, setName] = useState(name);
  const [draftCategory, setCategory] = useState(category);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (draftName.trim().length < 2) {
      setError(
        t(
          "Enter at least 2 characters for your studio name.",
          "Внесете најмалку 2 знаци за името на студиото.",
        ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaved(draftName.trim(), draftCategory);
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
        title={t("Tell us about your studio", "Претставете го вашето студио")}
        description={t(
          "Start with the basics. Photos and branding can wait.",
          "Започнете со основните податоци. Фотографии и лого можете да додадете подоцна.",
        )}
      >
        <FieldGroup>
          <Field>
            <FieldLabel data-replay-public htmlFor="business-name">
              {t("Studio name", "Име на студиото")}
            </FieldLabel>
            <Input
              id="business-name"
              value={draftName}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Studio Luna", "На пр. Студио Луна")}
              autoComplete="organization"
              required
              minLength={2}
              disabled={saving}
              className="min-h-12"
            />
          </Field>
          <Field>
            <FieldLabel data-replay-public htmlFor="business-category">
              {t("Studio category", "Категорија на студиото")}
            </FieldLabel>
            <select
              id="business-category"
              value={draftCategory}
              onChange={(e) => setCategory(e.target.value as BeautyCategory)}
              disabled={saving}
              className={inputVariants({ className: "min-h-12" })}
            >
              {beautyCategories.map(([value, en, mk]) => (
                <option key={value} value={value}>
                  {t(en, mk)}
                </option>
              ))}
            </select>
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
