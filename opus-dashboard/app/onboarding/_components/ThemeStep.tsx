"use client";

import { useState, type FormEvent } from "react";
import { DashboardThemePicker } from "@/components/dashboard/DashboardThemePicker";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { FieldError } from "@/components/ui/field";
import { useSaveDashboardTheme } from "@/hooks/use-dashboard-theme";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function ThemeStep({
  value,
  onBack,
  onSaved,
}: {
  value: DashboardTheme;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t } = useDashboardI18n();
  const [theme, setTheme] = useState(value);
  const [error, setError] = useState<string | null>(null);
  // Onboarding must stay on this step until the server accepts the choice.
  const { saveTheme, isSaving } = useSaveDashboardTheme({ optimistic: false });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await saveTheme(theme);
      onSaved();
    } catch {
      setError(
        t(
          "Could not save your theme. Please try again.",
          "Темата не е зачувана. Обидете се повторно.",
        ),
      );
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <StepFrame
        title={t(
          "Choose your dashboard theme",
          "Изберете тема за контролната табла",
        )}
        description={t(
          "Make your workspace your own.",
          "Прилагодете го работниот простор по ваш вкус.",
        )}
        wide
      >
        <DashboardThemePicker
          value={theme}
          onValueChange={setTheme}
          disabled={isSaving}
        />
        <FieldError className="mt-4 text-center" aria-live="polite">
          {error}
        </FieldError>
        <WizardActions canGoBack onBack={onBack} isSubmitting={isSaving} />
      </StepFrame>
    </form>
  );
}
