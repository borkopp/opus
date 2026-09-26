"use client";

import { useState } from "react";
import {
  Brush,
  Check,
  Dumbbell,
  Eye,
  Flower2,
  Hand,
  Leaf,
  PaintbrushVertical,
  PenTool,
  Scissors,
  Sparkles,
  Spline,
  type LucideIcon,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { beautyCategories, onboardingError } from "@/lib/i18n/onboarding";
import type { BeautyCategory } from "@/lib/onboarding";
import { StepFrame, WizardActions } from "./OnboardingStep";

const categoryIcons: Record<BeautyCategory, LucideIcon> = {
  barbershop: Scissors,
  hair_salon: Brush,
  nail_salon: PaintbrushVertical,
  spa: Flower2,
  beauty_salon: Sparkles,
  lash_studio: Eye,
  brow_bar: Spline,
  tattoo_studio: PenTool,
  massage_therapy: Hand,
  wellness_center: Leaf,
  personal_trainer: Dumbbell,
};

export function CategoryStep({
  category,
  onBack,
  onSaved,
}: {
  category: BeautyCategory | null;
  onBack: () => void;
  onSaved: (category: BeautyCategory) => Promise<void>;
}) {
  const { t, language } = useDashboardI18n();
  const [selected, setSelected] = useState(category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || saving) return;
    setError(null);
    setSaving(true);
    try {
      await onSaved(selected);
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
        title={t("What kind of studio do you run?", "Каков тип студио имате?")}
        description={t(
          "Choose the category that best fits your services.",
          "Изберете ја категоријата што најмногу одговара на вашите услуги.",
        )}
      >
        <FieldSet disabled={saving}>
          <FieldLegend className="sr-only">
            {t("Studio category", "Категорија на студиото")}
          </FieldLegend>
          <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {beautyCategories.map(([value, en, mk]) => {
              const Icon = categoryIcons[value];
              const checked = selected === value;
              return (
                <FieldLabel
                  key={value}
                  htmlFor={`category-${value}`}
                  className="relative h-full cursor-pointer bg-card has-data-[state=checked]:bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                >
                  <Field
                    className="min-h-28 items-center justify-center gap-3 text-center"
                    data-disabled={saving || undefined}
                  >
                    <input
                      id={`category-${value}`}
                      name="business-category"
                      type="radio"
                      value={value}
                      checked={checked}
                      onChange={() => setSelected(value)}
                      className="sr-only"
                      data-state={checked ? "checked" : "unchecked"}
                      required
                    />
                    <span className="flex justify-center" aria-hidden="true">
                      <Icon className="size-7" strokeWidth={1.5} />
                    </span>
                    <FieldTitle className="justify-center" data-replay-public>
                      {t(en, mk)}
                    </FieldTitle>
                  </Field>
                  {checked && (
                    <Check
                      className="absolute right-2 top-2 size-4"
                      aria-hidden="true"
                    />
                  )}
                </FieldLabel>
              );
            })}
          </FieldGroup>
          {error && <FieldError role="alert">{error}</FieldError>}
        </FieldSet>
        <WizardActions
          canGoBack
          onBack={onBack}
          isSubmitting={saving}
          disabled={!selected}
        />
      </StepFrame>
    </form>
  );
}
